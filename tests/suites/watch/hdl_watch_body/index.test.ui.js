import { test, expect } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'
import fixtureItems from '../../../fixtures/watch/items.json' with { type: 'json' }

const layout = 'watch'
const component = 'body'

const {
  getComponentUrl,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

const IMAGES_PATH = 'tests/suites/watch/main/views/assets/images'

// the tag every watch search carries along its own criteria
const WATCH_TAG = 'to watch'

const search = {
  offset: 0,
  max: 200,
  tags: [],
  connectees: [],
  text: '',
  workspace: '',
  includeDraft: true
}

// the even indexed fixtures, left to the playlists by the random draws
const playlistItems = fixtureItems.filter((_, index) => index % 2 === 0)
const playlist = playlistItems.map(({ $id }) => $id)

// the lookup answers in its own order: the carousel has to reorder the posters
const lookedUpItems = playlistItems.toReversed()

// the odd indexed fixtures, the other item type's playlist
const tvShowItems = fixtureItems.filter((_, index) => index % 2 === 1)
const tvShowPlaylist = tvShowItems.map(({ $id }) => $id)

const rewatchPlaylist = fixtureItems.map(({ $id }) => $id)

// its own order, and an entry the results don't carry
const rewatchSelection = [fixtureItems[4].$id, fixtureItems[0].$id, 'unknown_poster_id']

// more items than a single search carries, in two rounds
const manyItems = Array.from(
  { length: 250 },
  (_, index) => fixtureItems[index % fixtureItems.length]
)

// short enough for the sentinel to show at mount
const fewItems = fixtureItems.slice(0, 5)

// over twice a screenful, so the ratio is held at its floor, and no more, so
// that a short scroll takes the effects a long way along
const someItems = manyItems.slice(0, 60)

// the widths the posters are held to, as `hero_carousel.js` caps them
const STD_POSTER_WIDTH = 12.75
const MEDIAN_POSTER_WIDTH = 18.331

// shorter than the carousel: the selection has to be filled with random items
const shortPlaylist = [0, 2, 4, 6].map(index => fixtureItems[index].$id)

// one entry the lookup resolves to nothing
const playlistWithUnknownEntry = playlist.with(3, 'unknown_poster_id')

const missingFromSample = [0, 4].map(index => fixtureItems[index].$id)
const sampleItems = fixtureItems.filter(({ $id }) => !missingFromSample.includes($id))

// the odd indexed fixtures, drawn apart from the playlist ones
const seekResults = fixtureItems
  .filter((_, index) => index % 2 === 1)
  .slice(0, 5)
  .map(({ $id, title, snapshot, meta }) => ({
    id: meta?.externalId ?? $id,
    title,
    poster_path: snapshot.split('/').pop(),
    vote_average: meta?.score,
    overview: meta?.overview,
    release_date: meta?.date
  }))

const findModeState = {
  itemType: 'movie',
  searchMode: 'find',
  search
}

const config = { playlists: { 'watch sequence': { movie: playlist } } }

test('find mode display', async ({ page }) => {
  const findPayloads = []
  const countPayloads = []
  const lookupPayloads = []
  const tmdbRequests = []

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => {
    countPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems.length })
  })

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: lookedUpItems })
  })

  await page.route(/themoviedb/, route => {
    tmdbRequests.push(route.request().url())
    return route.fulfill({ json: {} })
  })

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the carousel holds the playlist, its first entry as the median poster
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))
  await expect(page.locator('.manual-add')).toBeHidden()

  // a second `find-items` call would mean the poster sample was fetched, which
  // a playlist as long as the carousel makes useless: the posters are looked up
  // instead, in a single call
  expect(findPayloads).toHaveLength(1)
  expect(countPayloads).toHaveLength(1)
  expect(lookupPayloads).toEqual([playlist])
  expect(tmdbRequests).toEqual([])
})

// the whole component in a single frame: carousel, grid and footer
test('whole component display', async ({ page }) => {
  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))
  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))

  await page.setViewportSize({ width: 1650, height: 1030 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  return expect(page).toHaveScreenshot(getScreenshotPath('full-height'))
})

test('add mode display', async ({ page }) => {
  const query = 'the'
  const lookupPayloads = []
  const tmdbRequests = []
  const unexpectedRequests = []

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: lookedUpItems })
  })

  for (const endpoint of ['/api/find-items', '/api/count-items']) {
    await page.route(endpoint, route => {
      unexpectedRequests.push(route.request().url())
      return route.fulfill({ json: [] })
    })
  }

  await page.route(/themoviedb.*\/configuration$/, route => {
    tmdbRequests.push(route.request().url())

    return route.fulfill({
      json: { images: { secure_base_url: 'https://image.tmdb.org/t/p/' } }
    })
  })

  await page.route(/themoviedb.*\/search\//, route => {
    tmdbRequests.push(route.request().url())

    return route.fulfill({
      json: { results: seekResults, total_results: seekResults.length }
    })
  })

  await page.route(
    'https://image.tmdb.org/**',
    route => route.fulfill({ path: `${IMAGES_PATH}/${route.request().url().split('/').pop()}` })
  )

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'movie',
        searchMode: 'add',
        search
      }
    }
  }))

  // add mode alone blurs the carousel and raises the grid, still empty for
  // want of a query
  await expect(page).toHaveScreenshot(getScreenshotPath('add-mode'))
  await expect(page.locator('.manual-add')).toBeHidden()
  expect(tmdbRequests).toEqual([])

  // the header raises the flag along the criteria it sets
  await setLayoutState(page, { 'search.text': query, searching: true })

  await expect(page).toHaveScreenshot(getScreenshotPath('add-mode-results'))
  await expect(page.locator('.manual-add')).toBeVisible()

  expect(tmdbRequests.map(url => new URL(url).pathname))
    .toEqual(['/3/configuration', '/3/search/movie'])

  expect(new URL(tmdbRequests[1]).searchParams.get('query')).toBe(query)
  expect(lookupPayloads).toEqual([playlist])
  expect(unexpectedRequests).toEqual([])
})

test('searching display', async ({ page }) => {
  const findPayloads = []
  const countPayloads = []
  const lookupPayloads = []

  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: {
        playlists: {
          'watch sequence': { movie: playlist },
          rewatch: { movie: rewatchPlaylist }
        }
      }
    })
  )

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => {
    countPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems.length })
  })

  // the carousel asks for its playlist, the grid for the selected one: both
  // answers hold the same items in the same order
  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()
    lookupPayloads.push(ids)

    return route.fulfill({
      json: ids.join() === playlist.join() ? lookedUpItems : fixtureItems
    })
  })

  await page.goto(getComponentUrl({
    params: { layoutState: { ...findModeState, searching: true } }
  }))

  await expect(page).toHaveScreenshot(getScreenshotPath('searching'))

  await setLayoutState(page, { searching: false, selectedPlaylist: 'rewatch' })

  // a selected playlist renders the way a running search does
  await expect(page).toHaveScreenshot(getScreenshotPath('searching'))

  // the playlist grid is looked up rather than searched
  expect(findPayloads).toHaveLength(1)
  expect(countPayloads).toHaveLength(1)
  expect(lookupPayloads).toEqual([playlist, rewatchPlaylist])
})

test('carousel detail modal', async ({ page }) => {
  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))
  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  await page.locator('.hero-poster.median').click()

  const [dracula] = playlistItems

  expect(await getModals(page)).toEqual([
    { component: 'hdl-watch-detailed-view', item: dracula }
  ])

  // no `add` listener on this path: the handler would have closed the modal,
  // which the recorder catches as a further entry
  await page.evaluate(() => {
    window.mockModal.mount()
    window.mockModal.element.dispatchEvent(new window.CustomEvent('add'))
  })

  expect(await getModals(page)).toHaveLength(1)
})

test('grid detail modal', async ({ page }) => {
  const hilda = fixtureItems.find(({ $id }) => $id === 'hilda')

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))
  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.route(
    /themoviedb.*\/configuration$/,
    route => route.fulfill({
      json: { images: { secure_base_url: 'https://image.tmdb.org/t/p/' } }
    })
  )

  await page.route(
    /themoviedb.*\/search\//,
    route => route.fulfill({
      json: { results: seekResults, total_results: seekResults.length }
    })
  )

  await page.route(
    'https://image.tmdb.org/**',
    route => route.fulfill({ path: `${IMAGES_PATH}/${route.request().url().split('/').pop()}` })
  )

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'movie',
        searchMode: 'add',
        search: { ...search, text: 'the' },
        searching: true
      }
    }
  }))

  await page.getByTitle(hilda.title, { exact: true }).click()

  // an item on its way to be added holds no `$id` yet, `meta.externalId` being
  // the only identifier it carries
  expect(await getModals(page)).toEqual([{
    component: 'hdl-watch-detailed-view',

    item: expect.objectContaining({
      title: hilda.title,
      meta: expect.objectContaining({ externalId: hilda.meta.externalId })
    })
  }])

  // mounting the modal is what registers the `add` listener
  await page.evaluate(() => {
    window.mockModal.mount()
    window.mockModal.element.dispatchEvent(new window.CustomEvent('add'))
  })

  await expect.poll(() => getLayoutState(page, 'searchMode')).toBe('find')

  // the second entry is the modal being closed
  expect(await getModals(page)).toEqual([expect.anything(), undefined])

  // the pointer would otherwise hover the poster taking the clicked one's
  // place, revealing its find mode controls
  await page.mouse.move(0, 0)

  // clicking may have scrolled the poster into view, the golden being at rest
  await page.locator(tag).evaluate(element => element.scrollTo(0, 0))

  // back to the find results, the search still running
  return expect(page).toHaveScreenshot(getScreenshotPath('searching'))
})

test('manual add modal', async ({ page }) => {
  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))
  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.route(
    /themoviedb.*\/configuration$/,
    route => route.fulfill({
      json: { images: { secure_base_url: 'https://image.tmdb.org/t/p/' } }
    })
  )

  await page.route(
    /themoviedb.*\/search\//,
    route => route.fulfill({
      json: { results: seekResults, total_results: seekResults.length }
    })
  )

  await page.route(
    'https://image.tmdb.org/**',
    route => route.fulfill({ path: `${IMAGES_PATH}/${route.request().url().split('/').pop()}` })
  )

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'movie',
        searchMode: 'add',
        search: { ...search, text: 'the' },
        searching: true
      }
    }
  }))

  await page.locator('.manual-add').click()

  // no item: the detailed view opens on a blank form
  expect(await getModals(page)).toEqual([
    { component: 'hdl-watch-detailed-view', item: undefined }
  ])

  await page.evaluate(() => {
    window.mockModal.mount()
    window.mockModal.element.dispatchEvent(new window.CustomEvent('add'))
  })

  await expect.poll(() => getLayoutState(page, 'searchMode')).toBe('find')
  expect(await getModals(page)).toEqual([expect.anything(), undefined])
})

test('default playlist poster selection', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({ json: { playlists: { 'watch sequence': { movie: shortPlaylist } } } })
  )

  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)

    // the grid search carries the layout search, the sample its own capped one
    return route.fulfill({ json: payload.max === search.max ? fixtureItems : sampleItems })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()
    lookupPayloads.push(ids)

    // answered backwards: the carousel order can only come from the playlist
    return route.fulfill({
      json: ids.map(id => fixtureItems.find(item => item.$id === id)).toReversed()
    })
  })

  // wide enough to hold the seven posters in frame
  await page.setViewportSize({ width: 1650, height: 720 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the playlist first, in its own order, then the random fill
  await expect(page.locator('.hero-carousel'))
    .toHaveScreenshot(getScreenshotPath('playlist-selection'))

  // only the entries the sample did not carry are looked up
  expect(lookupPayloads).toEqual([missingFromSample])

  // the grid search first, then the sample one
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max, 50])
})

test('random poster selection', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  // a playlist held for the other item type only
  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: { playlists: { 'watch sequence': { 'tv show': rewatchPlaylist } } }
    })
  )

  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: [] })
  })

  await page.setViewportSize({ width: 1650, height: 720 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // seven posters drawn out of the sample
  await expect(page.locator('.hero-carousel'))
    .toHaveScreenshot(getScreenshotPath('random-selection'))

  // nothing to look up without a playlist for the item type
  expect(lookupPayloads).toEqual([])

  // the grid search first, then the sample one
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max, 50])
})

test('random poster selection with repeated draws', async ({ page }) => {
  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: { playlists: { 'watch sequence': { 'tv show': rewatchPlaylist } } }
    })
  )

  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.setViewportSize({ width: 1650, height: 720 })

  await page.goto(getComponentUrl({
    params: {
      layoutState: findModeState,

      // the two leading values are drawn by the components for their own id,
      // then the third poster draw is repeated
      randomValues: [0, 0, 0.393, 0.393, 0.536, 0.679, 0.821, 0.964, 0.107, 0.25]
    }
  }))

  // the repeat is caught and drawn again, down to the same seven posters
  return expect(page.locator('.hero-carousel'))
    .toHaveScreenshot(getScreenshotPath('random-selection'))
})

test('random poster selection exhaustion', async ({ page }) => {
  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: { playlists: { 'watch sequence': { 'tv show': rewatchPlaylist } } }
    })
  )

  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.setViewportSize({ width: 1650, height: 720 })

  await page.goto(getComponentUrl({
    params: {
      layoutState: findModeState,

      // the two component ids aside, the cycling draws reach three fixtures
      // only, way short of the sample the selection is taken from
      randomValues: [0.107, 0.25, 0.393]
    }
  }))

  // the trials budget runs out on the fourth poster, and the carousel pads
  // itself by repeating the three it got
  return expect(page.locator('.hero-carousel'))
    .toHaveScreenshot(getScreenshotPath('exhausted-selection'))
})

test('playlist selection without sample', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({ json: { playlists: { 'watch sequence': { movie: shortPlaylist } } } })
  )

  // the sample search fails where the grid one succeeds, leaving the short
  // playlist nothing to be filled with
  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)

    return payload.max === search.max
      ? route.fulfill({ json: fixtureItems })
      : route.fulfill({ status: 500 })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()
    lookupPayloads.push(ids)

    // answered backwards: the carousel order can only come from the playlist
    return route.fulfill({
      json: ids.map(id => fixtureItems.find(item => item.$id === id)).toReversed()
    })
  })

  await page.setViewportSize({ width: 1650, height: 720 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the four playlist posters alone, repeated up to the carousel size
  await expect(page.locator('.hero-carousel'))
    .toHaveScreenshot(getScreenshotPath('playlist-only-selection'))

  // an empty sample carries none of the entries: they all get looked up
  expect(lookupPayloads).toEqual([shortPlaylist])

  // the sample was asked for and failed, rather than skipped
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max, 50])
})

test('poster selection failure', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  // the grid searches its items in find mode: the failing lookup is the
  // carousel one
  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ status: 500 })
  })

  await page.setViewportSize({ width: 1650, height: 720 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the carousel holds placeholders alone, while the grid keeps its items
  await expect(page).toHaveScreenshot(getScreenshotPath('placeholder-selection'))

  expect(lookupPayloads).toEqual([playlist])

  // no sample fetched to make up for the failure: the selection is left empty
  // rather than quietly randomised
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max])
})

test('unknown playlist entry', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: { playlists: { 'watch sequence': { movie: playlistWithUnknownEntry } } }
    })
  )

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  // the unknown id comes back as `null`, the way a real answer carries a
  // missing item; answered backwards, the order can only come from the playlist
  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()
    lookupPayloads.push(ids)

    return route.fulfill({
      json: ids.map(id => fixtureItems.find(item => item.$id === id)).toReversed()
    })
  })

  await page.setViewportSize({ width: 1650, height: 720 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the six resolved posters, one of them repeated to fill the seventh slot
  // rather than a placeholder standing for the unknown entry
  await expect(page.locator('.hero-carousel'))
    .toHaveScreenshot(getScreenshotPath('incomplete-playlist-selection'))

  expect(lookupPayloads).toEqual([playlistWithUnknownEntry])

  // a playlist as long as the carousel skips the sample: nothing backfills the
  // dropped entry
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max])
})

test('poster selection on item type change', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  const isMovieSearch = ({ tags: [itemType] }) => itemType === 'movie'

  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: { playlists: { 'watch sequence': { movie: playlist, 'tv show': tvShowPlaylist } } }
    })
  )

  // each item type gets its own results, telling the two searches apart
  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)

    return route.fulfill({ json: isMovieSearch(payload) ? fixtureItems : tvShowItems })
  })

  await page.route('/api/count-items', route => route.fulfill({
    json: isMovieSearch(route.request().postDataJSON())
      ? fixtureItems.length
      : tvShowItems.length
  }))

  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()
    lookupPayloads.push(ids)

    return route.fulfill({
      json: ids.map(id => fixtureItems.find(item => item.$id === id)).toReversed()
    })
  })

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the very rendering the find mode mount settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))

  await setLayoutState(page, { itemType: 'tv show' })

  // both halves follow the new item type: its playlist in the carousel, its
  // results in the grid
  await expect(page).toHaveScreenshot(getScreenshotPath('tv-show-mode'))

  expect(findPayloads.map(({ tags }) => tags)).toEqual([['movie'], ['tv show']])
  expect(lookupPayloads).toEqual([playlist, tvShowPlaylist])
})

test('find results update', async ({ page }) => {
  const findPayloads = []
  const countPayloads = []
  const lookupPayloads = []
  const tmdbRequests = []

  // the component only carries the criteria over: the filtering itself is the
  // backend's business
  const isQueried = ({ text }) => text !== `"${WATCH_TAG}"`
  const queriedItems = fixtureItems.slice(0, 3)

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)

    return route.fulfill({ json: isQueried(payload) ? queriedItems : fixtureItems })
  })

  await page.route('/api/count-items', route => {
    const payload = route.request().postDataJSON()
    countPayloads.push(payload)

    return route.fulfill({
      json: isQueried(payload) ? queriedItems.length : fixtureItems.length
    })
  })

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: lookedUpItems })
  })

  await page.route(/themoviedb/, route => {
    tmdbRequests.push(route.request().url())
    return route.fulfill({ json: {} })
  })

  // the raised grid holds the answer to the new criteria, the carousel is
  // left as is
  await expectResultsUpdate({
    page,
    layoutState: findModeState,
    mountGolden: 'find-mode',
    queriedGolden: 'query-results'
  })

  // the count is refreshed along the results, or the load more ceiling would
  // still describe the previous ones
  expect(findPayloads.map(({ text }) => text))
    .toEqual([`"${WATCH_TAG}"`, `the "${WATCH_TAG}"`, `"${WATCH_TAG}"`])
  expect(countPayloads.map(({ text }) => text)).toEqual(findPayloads.map(({ text }) => text))

  // the mount lookup alone: a search change is no reason to reload the selection
  expect(lookupPayloads).toEqual([playlist])

  // the other half of the search update stays out of find mode
  expect(tmdbRequests).toEqual([])
})

test('seek results update', async ({ page }) => {
  const lookupPayloads = []
  const tmdbRequests = []
  const unexpectedRequests = []

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: lookedUpItems })
  })

  for (const endpoint of ['/api/find-items', '/api/count-items']) {
    await page.route(endpoint, route => {
      unexpectedRequests.push(route.request().url())
      return route.fulfill({ json: [] })
    })
  }

  await page.route(/themoviedb.*\/configuration$/, route => {
    tmdbRequests.push(route.request().url())

    return route.fulfill({
      json: { images: { secure_base_url: 'https://image.tmdb.org/t/p/' } }
    })
  })

  await page.route(/themoviedb.*\/search\//, route => {
    tmdbRequests.push(route.request().url())

    return route.fulfill({
      json: { results: seekResults, total_results: seekResults.length }
    })
  })

  await page.route(
    'https://image.tmdb.org/**',
    route => route.fulfill({ path: `${IMAGES_PATH}/${route.request().url().split('/').pop()}` })
  )

  // the very renderings the add mode mount and query settle on
  await expectResultsUpdate({
    page,
    layoutState: { itemType: 'movie', searchMode: 'add', search },
    mountGolden: 'add-mode',
    queriedGolden: 'add-mode-results'
  })

  // the query alone reaches tmdb: an empty one is answered without asking
  // anything
  expect(tmdbRequests.map(url => new URL(url).pathname))
    .toEqual(['/3/configuration', '/3/search/movie'])

  expect(new URL(tmdbRequests[1]).searchParams.get('query')).toBe('the')

  // the carousel keeps the selection it was mounted with
  expect(lookupPayloads).toEqual([playlist])

  // the other half of the search update stays out of add mode
  expect(unexpectedRequests).toEqual([])
})

test('playlist selection results', async ({ page }) => {
  const findPayloads = []
  const lookupPayloads = []

  await page.route(
    '/api/get-config/watch',
    route => route.fulfill({
      json: {
        playlists: {
          'watch sequence': { movie: playlist },
          rewatch: { movie: rewatchSelection }
        }
      }
    })
  )

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: lookedUpItems })
  })

  await page.goto(getComponentUrl({
    params: { layoutState: { ...findModeState, searching: true } }
  }))

  // the very rendering a running search settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('searching'))

  await setLayoutState(page, { selectedPlaylist: 'rewatch' })

  // the results narrowed down to the playlist, in its order, the entry
  // resolving to nothing left out
  await expect(page).toHaveScreenshot(getScreenshotPath('playlist-results'))

  // the selection re-issues the search rather than looking the playlist up,
  // which a running search is precisely what tells apart
  expect(findPayloads).toHaveLength(2)
  expect(lookupPayloads).toEqual([playlist])
})

test('load more on scroll', async ({ page }) => {
  const findPayloads = []

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  // the search ceiling is honoured, the way the backend does
  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)

    return route.fulfill({ json: manyItems.slice(0, payload.max) })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: manyItems.length }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  await scrollToGridEnd(page)

  // raised by 100 from the initial 200, down to the items count
  await expect.poll(() => getLayoutState(page, 'search.max')).toBe(manyItems.length)

  // the grid has to hold the new rows before their end can be reached
  await expect(page.locator('.grid-poster')).toHaveCount(manyItems.length)

  await scrollToGridEnd(page)

  // the rows the second round brought in
  await expect(page).toHaveScreenshot(getScreenshotPath('loaded-more'))

  // one search per round, the second asking for the capped ceiling
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max, manyItems.length])
})

test('load more guards', async ({ page }) => {
  const findPayloads = []
  const posters = page.locator('.grid-poster')

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/find-items', route => {
    const payload = route.request().postDataJSON()
    findPayloads.push(payload)

    return route.fulfill({ json: manyItems.slice(0, payload.max) })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: manyItems.length }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))

  // results already in state, the way a previous search leaves them: the
  // sentinel shows under the short grid, and the items count calls for more
  await page.goto(getComponentUrl({
    params: {
      layoutState: { ...findModeState, items: fewItems, itemsCount: manyItems.length }
    }
  }))

  // the mount search answer, which sends the sentinel below the fold again
  await expect(posters).toHaveCount(search.max)

  await setLayoutState(page, { fetching: true })
  await scrollToGridEnd(page)

  await setLayoutState(page, { fetching: false })

  // leaving and entering again, so the sentinel is met anew
  await scrollToGridTop(page)

  // intersections are sampled per frame: the sentinel has to be out of sight
  // for one of them to be missed before it can be met again
  await page.evaluate(() => new Promise(
    resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))
  ))

  await scrollToGridEnd(page)

  await expect.poll(() => getLayoutState(page, 'search.max')).toBe(manyItems.length)
  await expect(posters).toHaveCount(manyItems.length)

  // the end of the grown grid, out of reach of the previous gesture
  await scrollToGridEnd(page)

  // the very rendering a load more settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('loaded-more'))

  await scrollToGridTop(page)

  await page.evaluate(() => new Promise(
    resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))
  ))

  await scrollToGridEnd(page)

  // two searches for four times the sentinel was met: the mount one, refused
  // for being the first, then the one the fetching flag held back, granted
  // once lowered, and the last one left to a fully loaded grid
  expect(findPayloads.map(({ max }) => max)).toEqual([search.max, manyItems.length])
})

test('config update sync', async ({ page }) => {
  const configRequests = []
  const findPayloads = []
  const lookupPayloads = []

  // the answers the update brings in, held back until it is notified
  let updated = false

  await page.route('/api/get-config/watch', route => {
    configRequests.push(route.request().url())

    return route.fulfill({
      json: { playlists: { 'watch sequence': { movie: updated ? tvShowPlaylist : playlist } } }
    })
  })

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: updated ? tvShowItems : fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({
    json: updated ? tvShowItems.length : fixtureItems.length
  }))

  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()
    lookupPayloads.push(ids)

    return route.fulfill({
      json: ids.map(id => fixtureItems.find(item => item.$id === id)).toReversed()
    })
  })

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the very rendering the find mode mount settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))

  updated = true
  await notify(page, { scope: 'watch', type: 'configUpdate' })

  // the item type is nowhere rendered: a playlist swap lands on the very
  // rendering switching to the other type settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('tv-show-mode'))

  // the config is fetched anew rather than taken from the state
  expect(configRequests).toHaveLength(2)

  // three searches for one update: the mount one, the one the unconditional
  // selected playlist reset issues on its own, and the one the sync makes —
  // a fourth would mean the items listener took the notification too
  expect(findPayloads).toHaveLength(3)

  // the carousel reloads from the config just brought in
  expect(lookupPayloads).toEqual([playlist, tvShowPlaylist])
})

test('selected playlist reset', async ({ page }) => {
  const findPayloads = []

  // the entries the updates bring in
  let rewatchEntries = rewatchSelection

  await page.route('/api/get-config/watch', route => route.fulfill({
    json: {
      playlists: {
        'watch sequence': { movie: playlist },
        rewatch: { movie: rewatchEntries }
      }
    }
  }))

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))

  // the carousel asks for its playlist, the grid for the selected one, whose
  // unknown entry comes back as `null`
  await page.route('/api/lookup-items', route => {
    const ids = route.request().postDataJSON()

    return route.fulfill({
      json: ids.join() === playlist.join()
        ? lookedUpItems
        : ids.map(id => fixtureItems.find(item => item.$id === id))
    })
  })

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the very rendering the find mode mount settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))

  // the playlist is picked once the config is in, the way it is in production
  await setLayoutState(page, { selectedPlaylist: 'rewatch' })

  // the very rendering a playlist selection settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('playlist-results'))

  await notify(page, { scope: 'watch', type: 'configUpdate' })

  // entries left to the playlist: the selection stands, and so does the grid
  await expect(page).toHaveScreenshot(getScreenshotPath('playlist-results'))
  expect(await getLayoutState(page, 'selectedPlaylist')).toBe('rewatch')

  rewatchEntries = []
  await notify(page, { scope: 'watch', type: 'configUpdate' })

  // an evaluate answer carries `null` where the state holds nothing
  await expect.poll(() => getLayoutState(page, 'selectedPlaylist')).toBe(null)

  // nothing left to select: the grid lowers back to the searched items
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))

  // the grid is looked up as long as a playlist is selected: past the mount
  // one, both searches belong to the update that cleared it
  expect(findPayloads).toHaveLength(3)
})

test('items update sync', async ({ page }) => {
  const configRequests = []
  const findPayloads = []
  const lookupPayloads = []

  // the items the update brings in, held back until it is notified
  let updated = false

  await page.route('/api/get-config/watch', route => {
    configRequests.push(route.request().url())
    return route.fulfill({ json: config })
  })

  await page.route('/api/find-items', route => {
    findPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: updated ? tvShowItems : fixtureItems })
  })

  await page.route('/api/count-items', route => route.fulfill({
    json: updated ? tvShowItems.length : fixtureItems.length
  }))

  await page.route('/api/lookup-items', route => {
    lookupPayloads.push(route.request().postDataJSON())
    return route.fulfill({ json: lookedUpItems })
  })

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the very rendering the find mode mount settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))

  updated = true
  await notify(page, { scope: 'watch', type: 'itemsUpdate' })

  // the grid holds what the search answers now, the carousel the same
  // playlist it was given
  await expect(page).toHaveScreenshot(getScreenshotPath('items-updated'))

  await notify(page, { scope: 'watch', type: 'connectionUpdate' })

  // a notification neither listener takes leaves the view where it stood
  await expect(page).toHaveScreenshot(getScreenshotPath('items-updated'))

  // the view syncs without the config being fetched anew
  expect(configRequests).toHaveLength(1)

  // the mount search and the update one: nothing came of the last notification
  expect(findPayloads).toHaveLength(2)

  // the carousel reloaded once, from the playlist it already held
  expect(lookupPayloads).toEqual([playlist, playlist])
})

test('poster widths on resize', async ({ page }) => {
  const SHORT_HEIGHT = 400
  const SHORTER_HEIGHT = 300
  const shrinkRatio = SHORTER_HEIGHT / SHORT_HEIGHT
  const medianPoster = page.locator('.hero-poster.median')

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))
  await page.route('/api/find-items', route => route.fulfill({ json: fixtureItems }))
  await page.route('/api/count-items', route => route.fulfill({ json: fixtureItems.length }))
  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))

  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  const tall = await getPosterWidths(page)

  // high enough a viewport for both widths to be held at their caps
  expect(tall.std).toBeCloseTo(STD_POSTER_WIDTH)
  expect(tall.median).toBeCloseTo(MEDIAN_POSTER_WIDTH)

  await page.setViewportSize({ width: 1280, height: SHORT_HEIGHT })
  await expect.poll(async () => (await getPosterWidths(page)).std).toBeLessThan(tall.std)

  const short = await getPosterWidths(page)
  const shortPosterBox = await medianPoster.boundingBox()

  await page.setViewportSize({ width: 1280, height: SHORTER_HEIGHT })
  await expect.poll(async () => (await getPosterWidths(page)).std).toBeLessThan(short.std)

  const shorter = await getPosterWidths(page)

  // under the caps, the widths are held to the viewport height
  expect(shorter.std / short.std).toBeCloseTo(shrinkRatio)
  expect(shorter.median / short.median).toBeCloseTo(shrinkRatio)

  // and reach the layout, rather than the state alone
  const shorterPosterBox = await medianPoster.boundingBox()
  expect(shorterPosterBox.width / shortPosterBox.width).toBeCloseTo(shrinkRatio)

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect.poll(async () => (await getPosterWidths(page)).std).toBe(tall.std)

  // coming back over the capping height, from under it: held again
  expect(await getPosterWidths(page)).toEqual(tall)
})

test('scroll effects', async ({ page }) => {
  // the items the update brings in, held back until it is notified
  let updated = false

  await page.route('/api/get-config/watch', route => route.fulfill({ json: config }))

  await page.route('/api/find-items', route => route.fulfill({
    json: updated ? someItems : fixtureItems
  }))

  await page.route('/api/count-items', route => route.fulfill({
    json: updated ? someItems.length : fixtureItems.length
  }))

  await page.route('/api/lookup-items', route => route.fulfill({ json: lookedUpItems }))

  await page.goto(getComponentUrl({ params: { layoutState: findModeState } }))

  // the very rendering the find mode mount settles on
  await expect(page).toHaveScreenshot(getScreenshotPath('find-mode'))

  // most of the content fits on screen: the carousel is left untouched
  expect(await getScrollRatio(page)).toBeGreaterThan(0.5)

  updated = true
  await notify(page, { scope: 'watch', type: 'itemsUpdate' })

  // past half the content out of sight, the ratio is dropped to its floor
  // rather than eased further down
  await expect.poll(() => getScrollRatio(page)).toBe(Number.EPSILON)

  // the effects are driven by the scroll position, the ratio setting how far
  // they go: a short scroll is enough for the easing to take them well in,
  // and leaves the carousel in frame
  await page.locator(tag).evaluate(
    element => element.scrollTo(0, (element.scrollHeight - element.clientHeight) / 4)
  )

  // the carousel darkened and blurred, the grid shadow at full. The capture
  // has to let animations be: the effects are carried by one, which the
  // default would turn off before taking the frame
  await expect(page).toHaveScreenshot(getScreenshotPath('dimmed-carousel'), {
    animations: 'allow'
  })
})

test.describe('on small screen', () => {
  // below --small-screen (1025px): no size menu padding
  test.use({ viewport: { width: 900, height: 667 } })

  test.fixme('small screen display', async ({ page }) => {
    // eslint-disable-next-line no-throw-literal
    throw 'not implemented'
  })
})

test.describe('on touch device', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true
  })

  // below --mini-screen (813px), with the enlarged manual add label
  test.fixme('mini screen display', async ({ page }) => {
    // eslint-disable-next-line no-throw-literal
    throw 'not implemented'
  })

  // once the grid is visible enough, the carousel swallows the touch moves,
  // and releases them again when the grid scrolls away
  test.fixme('carousel touch lock', async ({ page }) => {
    // eslint-disable-next-line no-throw-literal
    throw 'not implemented'
  })
})

async function expectResultsUpdate ({ page, layoutState, mountGolden, queriedGolden }) {
  await page.goto(getComponentUrl({ params: { layoutState } }))

  // the very rendering the mount settles on
  await expect(page).toHaveScreenshot(getScreenshotPath(mountGolden))

  // the header raises the flag along the criteria it sets
  await setLayoutState(page, { 'search.text': 'the', searching: true })
  await expect(page).toHaveScreenshot(getScreenshotPath(queriedGolden))

  await setLayoutState(page, { 'search.text': '', searching: false })

  // clearing the query brings the mount rendering back
  return expect(page).toHaveScreenshot(getScreenshotPath(mountGolden))
}

// the host is the scroller, and the sentinel sits at the end of the grid
const scrollToGridEnd = page => page.locator(tag)
  .evaluate(element => element.scrollTo(0, element.scrollHeight))

const scrollToGridTop = page => page.locator(tag)
  .evaluate(element => element.scrollTo(0, 0))

const getScrollRatio = page => page.locator(tag)
  .evaluate(element => parseFloat(element.style.getPropertyValue('--scroll-ratio')))

const getPosterWidths = page => page.locator(tag).evaluate(element => ({
  std: parseFloat(element.style.getPropertyValue('--std-poster-width')),
  median: parseFloat(element.style.getPropertyValue('--median-poster-width'))
}))

// every listener is called, the way the client dispatches to its subscribers
const notify = (page, notification) => page.evaluate(
  notification => window.mockSse.subscriptions.notification
    .forEach(listener => listener(notification)),

  notification
)

const getModals = page => page.evaluate(() => window.testContext.modals)

const getLayoutState = (page, key) => page.locator(tag)
  .evaluate(
    (element, prop) =>
      element.getJurisContext().services.HdlWatch.getLayoutState(prop),

    key
  )

const setLayoutState = (page, state) => page.locator(tag)
  .evaluate(
    (element, stateObject) =>
      element.getJurisContext().services.HdlWatch.setLayoutState(stateObject),

    state
  )
