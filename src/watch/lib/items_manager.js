import logger from '@byfrost/utils/logger.js'
import juris from 'lib/juris/instance.js'
import * as itemsApi from 'lib/items.js'
import { setConfig } from 'lib/config.js'
import * as itemsSeekerApi from './items_seeker.js'
import { WATCH_TAG, defaultSearch } from './constants.js'

const log = logger.getLogger('layout/watch/lib/items_manager')
let itemSearchSequence = Promise.resolve()
let searchAbortController

const allowedItemProps = [
  'title',
  'type',
  'url',
  'tags',
  'workspaces',
  'content',
  'meta'
]

juris.registerHeadlessComponent('ItemsManager', function ItemsManager (
  _/* props */,
  { services: { HdlWatch: { setLayoutState, getLayoutState } } }
) {
  const stripItemFromPlaylists = itemId => Object.fromEntries(
    Object.entries(getLayoutState('config.playlists', {}))
      .map(([playlistId, categories]) => {
        const filteredCategories = categories && Object.entries(categories)
          .map(([type, playlist]) => {
            const filteredPlaylist = playlist?.filter(id => id !== itemId)
            return [type, filteredPlaylist?.length > 0 ? filteredPlaylist : null]
          })

        return [
          playlistId,
          filteredCategories?.some(([, playlist]) => Boolean(playlist))
            ? Object.fromEntries(filteredCategories)
            : null
        ]
      })
  )

  return {
    api: {
      async findItems () {
        const {
          search,
          itemType,
          config: { playlists } = {},
          selectedPlaylist,
          searching
        } = getLayoutState() || {}

        const playlistEntries = selectedPlaylist && playlists?.[selectedPlaylist]?.[itemType]

        const searchByItemType = cleanSearch({
          ...search,
          tags: [itemType],
          text: `${search?.text || ''} "${WATCH_TAG}"`.trim()
        })

        if (selectedPlaylist && !playlistEntries?.length) {
          setLayoutState('items', [])
          return
        }

        try {
          // FIXME: Possibly requestAnimationFrame wrap needed
          setLayoutState('fetching', true)

          if (searchAbortController) {
            const reason = new Error('Issuing new search')
            reason.name = 'AbortError'
            searchAbortController?.abort(reason)
          }

          searchAbortController = new AbortController()

          itemSearchSequence = itemSearchSequence
            .catch(error => log.warn(error))
            .then(() => {
              if (selectedPlaylist && !searching) {
                return Promise.all([
                  itemsApi.lookup({
                    ids: playlistEntries,
                    abortController: searchAbortController
                  }),
                  undefined
                ])
              }

              return Promise.all([
                itemsApi.findItems(searchByItemType, searchAbortController),
                itemsApi.countItems(searchByItemType, searchAbortController)
              ])
            })

          const [items, itemsCount] = await itemSearchSequence

          const filteredItems = (
            selectedPlaylist && searching
              ? playlistEntries.map(id => items.find(item => item.$id === id))
              : items
          ).filter(item => Boolean(item))

          setLayoutState({
            items: filteredItems,
            itemsCount: selectedPlaylist ? filteredItems.length : itemsCount
          })
        } catch (error) {
          log.error('failed to find items for criteria', searchByItemType, 'due to error:\n', error)
        } finally {
          await itemSearchSequence.catch(error => log.warn(error))
          setLayoutState('fetching', false)
        }
      },

      async getItemsSample () {
        const searchByItemType = cleanSearch({
          ...defaultSearch,
          max: 50,
          tags: [getLayoutState('itemType')],
          text: `"${WATCH_TAG}"`
        })

        try {
          const items = await itemsApi.findItems(searchByItemType)
          return items
        } catch (error) {
          log.error('failed to get items for criteria', searchByItemType, 'due to error:\n', error)
        }

        return []
      },

      async seekItems () {
        const query = getLayoutState('search')?.text?.trim()

        log.debug('seekItems', { query })

        const searchByItemType = { query, type: getLayoutState('itemType') }

        try {
          const isFetching = Boolean(query)
          setLayoutState('fetching', isFetching)

          if (searchAbortController) {
            const reason = new Error('Issuing new seek')
            reason.name = 'AbortError'
            searchAbortController?.abort(reason)
          }

          if (isFetching) {
            searchAbortController = new AbortController()

            itemSearchSequence = itemSearchSequence
              .catch(error => log.warn(error))
              .then(() => itemsSeekerApi.findItems(searchByItemType, searchAbortController))
          } else {
            searchAbortController = undefined

            itemSearchSequence = itemSearchSequence
              .catch(error => log.warn(error))
              .then(() => ({ itemsCount: 0 }))
          }

          const { items, itemsCount } = await itemSearchSequence
          setLayoutState({ items, itemsCount })
        } catch (error) {
          log.error('failed to find items for criteria', searchByItemType, 'due to error:\n', error)
        } finally {
          await itemSearchSequence.catch(error => log.warn(error))
          setLayoutState('fetching', false)
        }
      },

      lookup: (...ids) => itemsApi.lookup({ ids }),
      externalLookup: id => itemsSeekerApi.lookup({ id, type: getLayoutState('itemType') }),

      save (media) {
        const refinedAllowedProps = [...allowedItemProps]

        if (!media.$id) {
          refinedAllowedProps.push('snapshot')
        }

        const updates = Object.fromEntries(
          Object.entries(media).filter(([key]) => refinedAllowedProps.includes(key))
        )

        updates.type ||= 'url'

        if (
          updates.meta &&
          (
            'originalTitle' in updates.meta ||
            [
              'genres',
              'directors',
              'cast'
            ].some(property => updates.meta[property]?.length > 0)
          )
        ) {
          const keywords = [...new Set([
            updates.meta.originalTitle,
            ...updates.meta.genres,
            ...updates.meta.directors,
            ...updates.meta.cast.map(person => person.name)
          ])].filter(keyword => Boolean(keyword))

          if (keywords.length > 0) {
            updates.keywords = keywords
          }
        }

        updates.tags = updates.tags
          ? [...new Set([...updates.tags, WATCH_TAG, getLayoutState('itemType')])]
          : [WATCH_TAG, getLayoutState('itemType')]

        return itemsApi.save(updates)
      },

      setPlaylist (itemId, playlist) {
        const playlists = stripItemFromPlaylists(itemId)

        if (playlist) {
          const itemType = getLayoutState('itemType')
          playlists[playlist] ??= { [itemType]: [] }
          playlists[playlist][itemType] ??= []
          playlists[playlist][itemType].push(itemId)
        }

        return setConfig('watch', { playlists })
      },

      savePlaylist (playlist, updates) {
        return setConfig('watch', {
          playlists: {
            [playlist]: {
              [getLayoutState('itemType')]: updates
            }
          }
        })
      },

      async remove (id) {
        await itemsApi.remove(id)
        const playlists = stripItemFromPlaylists(id)
        return setConfig('watch', { playlists })
      }
    }
  }
})

function cleanSearch (search) {
  const cleanedSearch = { ...search }

  for (const prop of ['text', 'workspace']) {
    if (prop in cleanedSearch && !cleanedSearch[prop]) {
      delete cleanedSearch[prop]
    }
  }

  return cleanedSearch
}

juris.initializeHeadlessComponent('ItemsManager')
