import { test } from '@japa/runner'
import * as td from 'testdouble'

const nativeConsole = console
const nativeFetch = fetch
const noop = () => {}
const mockConsole = {}

for (const property in nativeConsole) {
  if (typeof nativeConsole[property] === 'function') {
    mockConsole[property] = noop
  }
}

const TMDB_API_URL = 'https://themoviedb.trd-api.heimdallinsight.com:443/3'

const createBodyMatcher = (expect, body) => options => {
  try {
    const payload = options?.body && JSON.parse(options.body)
    expect(payload).toEqual(body)
    return true
  } catch {
    return false
  }
}

let setLayoutState
let getLayoutState
let layoutSubscribe
let itemsManager

test.group('watch items manager', group => {
  group.each.setup(async () => {
    Object.assign(globalThis, {
      window: globalThis,
      console: mockConsole,
      fetch: td.function('fetch')
    })

    const { default: juris } = await import('../../../../.lib/juris/instance.js')
    await import(`../../../../layouts/watch/--/lib/services.js?t=${Date.now()}.${performance.now()}`)
    await import(`../../../../layouts/watch/--/lib/items_manager.js?t=${Date.now()}.${performance.now()}`);

    ({ setLayoutState, getLayoutState, layoutSubscribe } = juris.services.HdlWatch);
    ({ api: itemsManager } = juris.getHeadlessComponent('ItemsManager'))
  })

  group.each.teardown(() => {
    delete globalThis.window

    Object.assign(globalThis, {
      console: nativeConsole,
      fetch: nativeFetch
    })

    td.reset()
  })

  test('#findItems search', async ({ expect }) => {
    const items = [{ $id: 'items/1', title: 'Dune' }]
    const fetchingStates = []

    setLayoutState({
      itemType: 'movie',
      search: { text: 'dune', workspace: '' }
    })

    expect(getLayoutState('fetching')).toBeFalsy()

    layoutSubscribe('fetching', state => fetchingStates.push(state))

    const matchSearch = createBodyMatcher(
      expect,
      { text: 'dune "to watch"', tags: ['movie'] }
    )

    td.when(fetch('/api/find-items', td.matchers.argThat(matchSearch)))
      .thenResolve({ ok: true, json: () => Promise.resolve(items) })

    td.when(fetch('/api/count-items', td.matchers.argThat(matchSearch)))
      .thenResolve({ ok: true, json: () => Promise.resolve(5) })

    await itemsManager.findItems()

    expect(getLayoutState('items')).toEqual(items)
    expect(getLayoutState('itemsCount')).toBe(5)
    expect(fetchingStates).toEqual([true, false])
  })

  test('#findItems search with empty text', async ({ expect }) => {
    setLayoutState({
      itemType: 'movie',
      search: { text: undefined }
    })

    const matchSearch = createBodyMatcher(
      expect,
      { text: '"to watch"', tags: ['movie'] }
    )

    td.when(fetch('/api/find-items', td.matchers.argThat(matchSearch)))
      .thenResolve({ ok: true, json: () => Promise.resolve([]) })

    td.when(fetch('/api/count-items', td.matchers.argThat(matchSearch)))
      .thenResolve({ ok: true, json: () => Promise.resolve(0) })

    await itemsManager.findItems()

    expect(getLayoutState('items')).toEqual([])
    expect(getLayoutState('itemsCount')).toBe(0)

    setLayoutState('search', null)

    await itemsManager.findItems()

    expect(getLayoutState('items')).toEqual([])
    expect(getLayoutState('itemsCount')).toBe(0)
  })

  test('#findItems search with selected playlist', async ({ expect }) => {
    setLayoutState({
      itemType: 'movie',
      search: { text: 'du' },
      selectedPlaylist: 'favorites',
      searching: true,
      config: { playlists: { favorites: { movie: ['items/2', 'items/1'] } } }
    })

    const matchSearch = createBodyMatcher(
      expect,
      { text: 'du "to watch"', tags: ['movie'] }
    )

    td.when(fetch('/api/find-items', td.matchers.argThat(matchSearch)))
      .thenResolve({
        ok: true,
        json: () => Promise.resolve([
          { $id: 'items/1', title: 'Dune' },
          { $id: 'items/3', title: 'Dune: Part Two' }
        ])
      })

    td.when(fetch('/api/count-items', td.matchers.argThat(matchSearch)))
      .thenResolve({ ok: true, json: () => Promise.resolve(2) })

    await itemsManager.findItems()

    expect(getLayoutState('items')).toEqual([{ $id: 'items/1', title: 'Dune' }])
    expect(getLayoutState('itemsCount')).toBe(1)
  })

  test('#findItems selected playlist items retrieval', async ({ expect }) => {
    const items = [
      { $id: 'items/2', title: 'Odyssey' },
      { $id: 'items/1', title: 'Dune' }
    ]

    setLayoutState({
      itemType: 'movie',
      search: { text: '' },
      selectedPlaylist: 'favorites',
      config: { playlists: { favorites: { movie: ['items/2', 'items/1'] } } }
    })

    const matchIds = createBodyMatcher(expect, ['items/2', 'items/1'])

    td.when(fetch('/api/lookup-items', td.matchers.argThat(matchIds)))
      .thenResolve({ ok: true, json: () => Promise.resolve(items) })

    await itemsManager.findItems()

    td.verify(fetch('/api/find-items'), { times: 0, ignoreExtraArgs: true })
    td.verify(fetch('/api/count-items'), { times: 0, ignoreExtraArgs: true })
    expect(getLayoutState('items')).toEqual(items)
    expect(getLayoutState('itemsCount')).toBe(2)
  })

  test('#findItems empty selected playlist', async ({ expect }) => {
    setLayoutState({
      itemType: 'movie',
      search: { text: '' },
      selectedPlaylist: 'favorites'
    })

    await itemsManager.findItems()

    expect(td.explain(fetch).callCount).toBe(0)
    expect(getLayoutState('items')).toEqual([])
  })

  test('#findItems/#seekItems new search aborts the previous one', async ({ expect }) => {
    const captor = td.matchers.captor()

    setLayoutState({
      itemType: 'movie',
      search: { text: 'dune' }
    })

    td.when(fetch('/api/find-items', captor.capture()))
      .thenResolve({ ok: true, json: () => Promise.resolve([]) })

    td.when(fetch('/api/count-items', td.matchers.anything()))
      .thenResolve({ ok: true, json: () => Promise.resolve(0) })

    await itemsManager.findItems()

    {
      const searchSignal = captor.value.signal
      expect(searchSignal.aborted).toBe(false)

      await itemsManager.findItems()
      expect(searchSignal.aborted).toBe(true)
    }

    {
      const searchSignal = captor.value.signal
      expect(searchSignal.aborted).toBe(false)

      setLayoutState('searchMode', 'add')

      td.when(fetch(`${TMDB_API_URL}/configuration`, captor.capture()))
        .thenResolve({
          ok: true,
          json: () => Promise.resolve({ images: { secure_base_url: 'https://images.tmdb.org/' } })
        })

      await itemsManager.seekItems()
      expect(searchSignal.aborted).toBe(true)
    }

    td.verify(fetch(`${TMDB_API_URL}/search/movie?query=dune`, captor.capture()))

    {
      const searchSignal = captor.value.signal
      expect(searchSignal.aborted).toBe(false)

      setLayoutState('searchMode', 'find')
      await itemsManager.findItems()
      expect(searchSignal.aborted).toBe(true)
    }
  })

  test('#findItems search failure', async ({ expect }) => {
    const fetchingStates = []

    setLayoutState({
      itemType: 'movie',
      search: { text: 'dune' }
    })

    layoutSubscribe('fetching', state => fetchingStates.push(state))

    td.when(fetch(td.matchers.anything(), td.matchers.anything()))
      .thenReject(new Error('network failure'))

    await itemsManager.findItems()

    expect(getLayoutState('items')).toBeNull()
    expect(fetchingStates).toEqual([true, false])
  })

  test('#getItemsSample sample retrieval', async ({ expect }) => {
    const items = [{ $id: 'items/1', title: 'Dune' }]

    setLayoutState('itemType', 'movie')

    const matchSearch = createBodyMatcher(expect, {
      offset: 0,
      max: 50,
      tags: ['movie'],
      connectees: [],
      text: '"to watch"',
      includeDraft: true
    })

    td.when(fetch('/api/find-items', td.matchers.argThat(matchSearch)))
      .thenResolve({ ok: true, json: () => Promise.resolve(items) })

    expect(await itemsManager.getItemsSample()).toEqual(items)
  })

  test('#getItemsSample retrieval failure', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    td.when(fetch('/api/find-items', td.matchers.anything()))
      .thenReject(new Error('network failure'))

    expect(await itemsManager.getItemsSample()).toEqual([])
  })

  test('#seekItems search', async ({ expect }) => {
    const fetchingStates = []

    setLayoutState({
      itemType: 'movie',
      search: { text: ' dune ' }
    })

    layoutSubscribe('fetching', state => fetchingStates.push(state))

    td.when(fetch(`${TMDB_API_URL}/configuration`, td.matchers.anything()))
      .thenResolve({
        ok: true,
        json: () => Promise.resolve({ images: { secure_base_url: 'https://images.tmdb.org/' } })
      })

    td.when(fetch(`${TMDB_API_URL}/search/movie?query=dune`, td.matchers.anything()))
      .thenResolve({
        ok: true,

        json: () => Promise.resolve({
          results: [{ id: 693134, title: 'Dune: Part Two' }],
          total_results: 42
        })
      })

    await itemsManager.seekItems()

    const items = getLayoutState('items')

    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Dune: Part Two')
    expect(getLayoutState('itemsCount')).toBe(42)
    expect(fetchingStates).toEqual([true, false])
  })

  test('#seekItems search without query', async ({ expect }) => {
    setLayoutState({
      itemType: 'movie',
      search: { text: '  ' }
    })

    await itemsManager.seekItems()

    expect(td.explain(fetch).callCount).toBe(0)
    expect(getLayoutState('itemsCount')).toBe(0)
    expect(getLayoutState('items')).toBeNull()
    expect(getLayoutState('fetching')).toBe(false)
  })

  test('#lookup items', async ({ expect }) => {
    const items = [{ $id: 'items/1' }, { $id: 'items/2' }]

    const matchIds = createBodyMatcher(expect, ['items/1', 'items/2'])

    td.when(fetch('/api/lookup-items', td.matchers.argThat(matchIds)))
      .thenResolve({ ok: true, json: () => Promise.resolve(items) })

    expect(await itemsManager.lookup('items/1', 'items/2')).toEqual(items)
  })

  test('#externalLookup item', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    td.when(fetch(`${TMDB_API_URL}/configuration`, td.matchers.anything()))
      .thenResolve({
        ok: true,
        json: () => Promise.resolve({ images: { secure_base_url: 'https://images.tmdb.org/' } })
      })

    td.when(fetch(`${TMDB_API_URL}/movie/42?append_to_response=credits`, td.matchers.anything()))
      .thenResolve({
        ok: true,
        json: () => Promise.resolve({ id: 42, title: 'Dune' })
      })

    const item = await itemsManager.externalLookup(42)
    expect(item.title).toBe('Dune')
  })

  test('#save new item', async ({ expect }) => {
    const savedItem = { $id: 'items/1' }

    setLayoutState('itemType', 'movie')

    const matchItem = createBodyMatcher(expect, {
      title: 'Dune',
      type: 'url',
      url: 'https://www.themoviedb.org/movie/438631',
      snapshot: 'https://images.tmdb.org/w500/dune.jpg',
      workspaces: ['watching'],
      content: 'epic',

      meta: {
        originalTitle: 'Dune',
        genres: ['Science Fiction', 'Adventure'],
        directors: ['Denis Villeneuve'],

        cast: [
          { name: 'Timothée Chalamet' },
          { name: 'Denis Villeneuve' }
        ]
      },

      keywords: [
        'Dune',
        'Science Fiction',
        'Adventure',
        'Denis Villeneuve',
        'Timothée Chalamet'
      ],

      tags: ['sci-fi', 'to watch', 'movie']
    })

    td.when(fetch('/api/save-item', td.matchers.argThat(matchItem)))
      .thenResolve({ ok: true, json: () => Promise.resolve(savedItem) })

    const result = await itemsManager.save({
      title: 'Dune',
      url: 'https://www.themoviedb.org/movie/438631',
      snapshot: 'https://images.tmdb.org/w500/dune.jpg',
      tags: ['sci-fi', 'to watch'],
      workspaces: ['watching'],
      content: 'epic',
      score: 8.4, // disallowed prop

      meta: {
        originalTitle: 'Dune',
        genres: ['Science Fiction', 'Adventure'],
        directors: ['Denis Villeneuve'],

        cast: [
          { name: 'Timothée Chalamet' },
          { name: 'Denis Villeneuve' } // duplicate of director
        ]
      }
    })

    expect(result).toEqual(savedItem)
  })

  test('#save existing item', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    {
      const matchItem = createBodyMatcher(expect, {
        title: 'Dune',
        type: 'url',
        meta: { score: 8.4 },
        tags: ['to watch', 'movie']
      })

      td.when(fetch('/api/save-item', td.matchers.argThat(matchItem)))
        .thenResolve({ ok: true, json: () => Promise.resolve({ $id: 'items/1' }) })
    }

    await itemsManager.save({
      $id: 'items/1',
      title: 'Dune',
      snapshot: 'https://images.tmdb.org/w500/dune.jpg',
      meta: { score: 8.4 }
    })

    {
      const matchItem = createBodyMatcher(expect, {
        title: 'Dune',
        type: 'url',
        tags: ['to watch', 'movie']
      })

      td.when(fetch('/api/save-item', td.matchers.argThat(matchItem)))
        .thenResolve({ ok: true, json: () => Promise.resolve({ $id: 'items/1' }) })
    }

    return itemsManager.save({
      $id: 'items/1',
      title: 'Dune',
      snapshot: 'https://images.tmdb.org/w500/dune.jpg'
    })
  })

  test('#setPlaylist change', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    setLayoutState('config.playlists', {
      favorites: {
        movie: ['items/1', 'items/2'],
        'tv show': ['items/3']
      },

      'sci-fi': { movie: ['items/1'] },
      'watch sequence': { 'tv show': ['items/4'] }
    })

    const matchConfig = createBodyMatcher(expect, {
      playlists: {
        favorites: {
          movie: ['items/2'],
          'tv show': ['items/3']
        },

        'sci-fi': null,

        'watch sequence': {
          'tv show': ['items/4'],
          movie: ['items/1']
        }
      }
    })

    td.when(fetch('/api/set-config/watch', td.matchers.argThat(matchConfig)))
      .thenResolve({ ok: true })

    return itemsManager.setPlaylist('items/1', 'watch sequence')
  })

  test('#setPlaylist removal', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    setLayoutState(
      'config.playlists',

      {
        favorites: {
          movie: ['items/1', 'items/2'],
          'tv show': ['items/3']
        }
      }
    )

    {
      const matchConfig = createBodyMatcher(expect, {
        playlists: { favorites: { movie: ['items/2'], 'tv show': ['items/3'] } }
      })

      td.when(fetch('/api/set-config/watch', td.matchers.argThat(matchConfig)))
        .thenResolve({ ok: true })
    }

    await itemsManager.setPlaylist('items/1', undefined)

    {
      const matchConfig = createBodyMatcher(expect, {
        playlists: { favorites: { movie: ['items/1', 'items/2'], 'tv show': null } }
      })

      td.when(fetch('/api/set-config/watch', td.matchers.argThat(matchConfig)))
        .thenResolve({ ok: true })
    }

    return itemsManager.setPlaylist('items/3', undefined)
  })

  test('#savePlaylist', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    const matchConfig = createBodyMatcher(expect, {
      playlists: { favorites: { movie: ['items/2', 'items/1'] } }
    })

    td.when(fetch('/api/set-config/watch', td.matchers.argThat(matchConfig)))
      .thenResolve({ ok: true })

    await itemsManager.savePlaylist('favorites', ['items/2', 'items/1'])
  })

  test('#remove item', async ({ expect }) => {
    setLayoutState('itemType', 'movie')

    setLayoutState('config.playlists', {
      favorites: { movie: ['m1', 'm2'] },
      'sci-fi': { movie: ['m1'] }
    })

    td.when(fetch('/api/remove-item/m1', td.matchers.anything()))
      .thenResolve({ ok: true })

    const matchConfig = createBodyMatcher(expect, {
      playlists: {
        favorites: { movie: ['m2'] },
        'sci-fi': null
      }
    })

    td.when(fetch('/api/set-config/watch', td.matchers.argThat(matchConfig)))
      .thenResolve({ ok: true })

    return itemsManager.remove('m1')
  })
})
