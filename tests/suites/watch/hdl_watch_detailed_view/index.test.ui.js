import { test, expect, getPaddedBoundingBox, getClip } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'
import fixtureItems from '../../../fixtures/watch/items.json' with { type: 'json' }
import '../../../helpers/polyfill.js'

const layout = 'watch'
const component = 'detailed_view'

const {
  getComponentUrl,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

const imagesPath = '/heimdall-layouts/tests/suites/watch/main/views/assets/images'
const underTheSkin = fixtureItems.find(({ $id }) => $id === 'under_the_skin')
const vanished = fixtureItems.find(({ $id }) => $id === 'vanished')
const hilda = fixtureItems.find(({ $id }) => $id === 'hilda')

const detailedUnderTheSkin = {
  ...underTheSkin,

  meta: {
    ...underTheSkin.meta,
    duration: 108,
    genres: ['Science Fiction', 'Drama'],
    directors: ['Jonathan Glazer'],

    cast: [
      {
        name: 'Scarlett Johansson',
        character: 'The Female',
        picture: `${imagesPath}/asap_rocky.webp`
      },

      { name: 'Jeremy McWilliams', character: 'The Bad Man' }
    ]
  }
}

const detailedHilda = {
  ...hilda,

  meta: {
    ...hilda.meta,
    duration: 1166400, // exactly 2 years and 3 months in minutes
    genres: ['Animation', 'Family'],
    directors: ['Luke Pearson'],

    cast: [
      { name: 'Bella Ramsey', character: 'Hilda', picture: `${imagesPath}/asap_rocky.webp` },
      { name: 'Daisy Haggard', character: 'Johanna' }
    ],

    seasonsCount: 2,
    ended: true
  }
}

test('default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('default'))
})

test('find mode item detail display', async ({ page, context }) => {
  const { promise: lookupGate, resolve: fulfillLookup } = Promise.withResolvers()
  const lookupPayloads = []

  await page.route('/api/lookup-items', async route => {
    lookupPayloads.push(route.request().postDataJSON())
    await lookupGate
    return route.fulfill({ json: [detailedUnderTheSkin] })
  })

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const detailedView = page.locator(tag)

  // placeholders displayed while the lookup is pending
  await expect(detailedView).toHaveScreenshot(getScreenshotPath('fetching-detail'))
  expect(await detailedView.locator('.fetching').count()).toBeGreaterThan(0)

  fulfillLookup()

  // loaded detail: title, 14/03 date, genres, 1h 48 duration, 6.1 score badge,
  // director, 2014 year, synopsis and cast
  await expect(detailedView).toHaveScreenshot(getScreenshotPath('detail'))

  expect(lookupPayloads).toEqual([[underTheSkin.$id]])

  const tabLoad = context.waitForEvent('page')
  await detailedView.locator('a.poster').click()

  const linkTab = await tabLoad
  await linkTab.waitForLoadState()

  expect(linkTab.url())
    .toMatch(new RegExp(`^${underTheSkin.url.replaceAll('.', '\\.')}(\\D|$)`))

  const actors = detailedView.locator('.actor')
  const scarlett = actors.first()
  const [scarlettData] = detailedUnderTheSkin.meta.cast

  return expect(scarlett)
    .toHaveAttribute('title', `${scarlettData.name}\n ⤷ ${scarlettData.character}`)
})

test('add mode external item lookup', async ({ page, context }) => {
  const { promise: lookupGate, resolve: fulfillLookup } = Promise.withResolvers()

  // item as produced by a TMDB search result: no $id yet
  const { $id, ...underTheSkinExternal } = underTheSkin

  await page.route(
    /themoviedb.+\/3\/configuration$/,
    route => route.fulfill({ json: { images: { secure_base_url: 'https://image.tmdb.org/' } } })
  )

  await page.route(/themoviedb.+\/3\/movie\/97370\?append_to_response=credits$/, async route => {
    await lookupGate

    return route.fulfill({
      json: {
        id: underTheSkin.meta.externalId,
        title: underTheSkin.title,
        poster_path: 'under_the_skin.webp',
        overview: underTheSkin.meta.overview,
        vote_average: underTheSkin.meta.score,
        release_date: underTheSkin.meta.date,
        runtime: 108,
        genres: [{ name: 'Science Fiction' }, { name: 'Drama' }],

        credits: {
          crew: [{ job: 'Director', name: 'Jonathan Glazer' }],

          cast: [
            { name: 'Scarlett Johansson', character: 'The Female', profile_path: 'scarlett.webp' },
            { name: 'Jeremy McWilliams', character: 'The Bad Man' }
          ]
        }
      }
    })
  })

  // converted snapshot/avatar urls are served with real images
  await page.route('https://image.tmdb.org/**', route => route.fulfill({
    path: route.request().url().includes('/w500/')
      ? 'tests/suites/watch/main/views/assets/images/under_the_skin.webp'
      : 'tests/suites/watch/main/views/assets/images/asap_rocky.webp'
  }))

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkinExternal,
      layoutState: { itemType: 'movie', searchMode: 'add' }
    }
  }))

  const detailedView = page.locator(tag)
  await expect(detailedView).toHaveScreenshot(getScreenshotPath('fetching-detail'))

  fulfillLookup()

  await expect(detailedView).toHaveScreenshot(getScreenshotPath('detail'))

  const tabLoad = context.waitForEvent('page')
  await detailedView.locator('a.poster').click()

  const linkTab = await tabLoad
  await linkTab.waitForLoadState()

  expect(linkTab.url())
    .toMatch(new RegExp(`^${underTheSkin.url.replaceAll('.', '\\.')}(\\D|$)`))

  const hasItemParamBeenEdited = await page
    .evaluate(() => window.testContext.parameters.item.genres != null)

  expect(hasItemParamBeenEdited).toBe(false)
})

test('item lookup failure', async ({ page }) => {
  const { promise: lookupGate, resolve: fulfillLookup } = Promise.withResolvers()

  await page.route('/api/lookup-items', async route => {
    await lookupGate
    return route.fulfill({ status: 500 })
  })

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const detailedView = page.locator(tag)
  await expect(detailedView).toHaveScreenshot(getScreenshotPath('fetching-detail'))

  fulfillLookup()

  // fetching state cleared despite the failure
  await expect(detailedView.locator('.fetching')).toHaveCount(0)

  // fallback labels: noClassification, capitalized noDuration, unknown director
  return expect(detailedView).toHaveScreenshot(getScreenshotPath('detail-lookup-failure'))
})

test('display fallbacks without item meta', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [vanished] }))

  await page.goto(getComponentUrl({
    params: {
      item: vanished,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  // noReleaseDate, noClassification, capitalized noDuration, ' - ' score badge,
  // unknown director/year/synopsis and an empty cast section
  return expect(page.locator(tag)).toHaveScreenshot(getScreenshotPath('detail-no-meta'))
})

test('score badge colouring', async ({ page }) => {
  let lookupPayload = detailedUnderTheSkin

  await page.route('/api/lookup-items', route => route.fulfill({ json: [lookupPayload] }))

  const scoreBadge = page.locator(tag).locator('.score-badge')

  // lowest and highest scores sit at both ends of the deepsky/grass mix, a missing
  // score falls back to the middle of it rather than to the lowest
  for (const [score, golden] of [
    [0, 'score-badge-lowest'],
    [10, 'score-badge-highest'],
    [undefined, 'score-badge-unrated']
  ]) {
    const item = { ...underTheSkin, meta: { ...underTheSkin.meta, score } }

    lookupPayload = {
      ...detailedUnderTheSkin,
      meta: { ...detailedUnderTheSkin.meta, score }
    }

    await page.goto(getComponentUrl({
      params: {
        item,
        layoutState: { itemType: 'movie', searchMode: 'find' }
      }
    }))

    await expect(scoreBadge).toHaveScreenshot(getScreenshotPath(golden))
  }
})

test('add mode form', async ({ page }) => {
  const { promise: save, resolve: fullfillSave } = Promise.withResolvers()
  const savedItems = []

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')

  await page.route('/api/save-item', async route => {
    savedItems.push(route.request().postDataJSON())
    await save
    return route.fulfill({ json: { $id: 'items/blade_runner' } })
  })

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'movie',
        searchMode: 'add',
        search: { text: 'blade runner' }
      }
    }
  }))

  const detailedView = page.locator(tag)

  // title input prefilled from the layout search text, url input in place of the
  // meta rows, shared control inactive (draft default tag), save button disabled
  await expect(detailedView).toHaveScreenshot(getScreenshotPath('add-blank-form'))

  const titleInput = detailedView.getByPlaceholder('title')
  const urlInput = detailedView.getByPlaceholder('url')
  const saveButton = detailedView.getByRole('button', { name: 'add movie' })

  await urlInput.fill('not a url')
  await expect(saveButton).toBeDisabled()

  await urlInput.fill('https://tmdb/blade_runner')
  await expect(saveButton).toBeEnabled()

  await titleInput.fill('')
  await expect(saveButton).toBeDisabled()

  await titleInput.fill('blade runner 2049')
  await saveButton.click()

  await expect(saveButton).toContainClass('pending')

  fullfillSave()

  // success keeps the pending pulse animation running: class assert instead of a capture
  await expect(saveButton).toContainClass('success')

  // adding case: content saved with the draft default tag and the refined type/tags
  expect(savedItems).toEqual([{
    title: 'blade runner 2049',
    url: 'https://tmdb/blade_runner',
    type: 'url',
    tags: ['draft', 'to watch', 'movie']
  }])

  // no playlist assignment since the playlist is untouched
  expect(sentConfigs).toEqual([])

  return expect(detailedView).toHaveScreenshot(getScreenshotPath('add-success'))
})

test('playlist preset from config', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: {
        itemType: 'movie',
        searchMode: 'find',

        'config.playlists': {
          'watch sequence': { movie: [underTheSkin.$id, 'the_astronaut'] },
          rewatch: { 'tv show': ['hilda'] }
        }
      }
    }
  }))

  const detailedView = page.locator(tag)
  const form = detailedView.locator('.form')

  // playlist input prefilled from the movie category, completion list filtered to the
  // current item type ('rewatch' holds tv shows only), save button disabled
  await expect(form).toHaveScreenshot(getScreenshotPath('preset-playlist-form'))

  const playlistInput = form.locator('.playlist-field input')
  const saveButton = form.getByRole('button', { name: 'set playlist' })

  await playlistInput.fill('favorites')
  await expect(saveButton).toBeEnabled()

  // back to the initial playlist: save disabled again
  await playlistInput.fill('watch sequence')
  await expect(saveButton).toBeDisabled()
})

test('tv show detail display', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedHilda] }))

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  // creator·s label instead of director, duration displayed as 2 year·s 3 month·s,
  // follow up row showing the s1/s2 season controls and the watched control (ended show)
  return expect(page.locator(tag)).toHaveScreenshot(getScreenshotPath('tv-show-detail'))
})

test('3d tag toggle', async ({ page }) => {
  const { promise: saveGate, resolve: fulfillSave } = Promise.withResolvers()
  const savedItems = []

  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  await page.route('/api/save-item', async route => {
    savedItems.push(route.request().postDataJSON())
    await saveGate
    return route.fulfill({ json: { $id: underTheSkin.$id } })
  })

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const detailedView = page.locator(tag)
  const tagsRow = detailedView.locator('.tags')
  const d3Button = tagsRow.locator('button.d3')

  await d3Button.click()

  // pending pulse animation on the toggled tag: class assert instead of a capture
  await expect(d3Button).toContainClass('pending')

  // every control disabled while the save is pending
  for (const control of await detailedView.locator('button, input').all()) {
    await expect(control).toBeDisabled()
  }

  fulfillSave()

  // display reset: pending indicator cleared, controls re-enabled, 3d tag active
  await expect(d3Button).not.toContainClass('pending')

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-3d-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  await d3Button.click()

  await expect(d3Button).not.toContainClass('pending')

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-default'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // save payloads with then without the 3d tag
  expect(savedItems.map(({ tags }) => tags)).toEqual([
    ['draft', '3d', 'to watch', 'movie'],
    ['draft', 'to watch', 'movie']
  ])
})

test('shared tag toggle', async ({ page }) => {
  const savedItems = []

  // persisted shared item: no draft tag
  const sharedUnderTheSkin = { ...detailedUnderTheSkin, tags: ['to watch', 'movie'] }

  await page.route('/api/lookup-items', route => route.fulfill({ json: [sharedUnderTheSkin] }))

  await page.route('/api/save-item', route => {
    savedItems.push(route.request().postDataJSON())
    return route.fulfill({ json: { $id: underTheSkin.$id } })
  })

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const detailedView = page.locator(tag)
  const tagsRow = detailedView.locator('.tags')
  const sharedButton = tagsRow.getByRole('button', { name: 'shared' })

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-shared-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  await sharedButton.click()

  // draft tag added: same settled display as the default tags row
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-default'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  await sharedButton.click()

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-shared-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // draft added to then removed from the save payload
  expect(savedItems.map(({ tags }) => tags)).toEqual([
    ['to watch', 'movie', 'draft'],
    ['to watch', 'movie']
  ])
})

test('follow up exclusive toggles', async ({ page }) => {
  const savedItems = []

  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  await page.route('/api/save-item', route => {
    savedItems.push(route.request().postDataJSON())
    return route.fulfill({ json: { $id: underTheSkin.$id } })
  })

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const detailedView = page.locator(tag)
  const tagsRow = detailedView.locator('.tags')
  const watchingButton = tagsRow.getByRole('button', { name: 'watching' })
  const watchedButton = tagsRow.getByRole('button', { name: 'watched' })

  await watchedButton.click()

  // watched activated in place of watching
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-watched-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  await watchingButton.click()

  // watching activated back in place of watched: initial display restored
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-default'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  await watchingButton.click()

  // re-click deactivated: no follow up left
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-no-follow-up'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // the opposite follow up workspace is removed on each activation
  expect(savedItems.map(({ workspaces }) => workspaces)).toEqual([
    ['watched'],
    ['watching'],
    []
  ])
})

test('default playlist side effects on follow up change', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))
  await page.route('/api/save-item', route => route.fulfill({ json: { $id: underTheSkin.$id } }))

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: {
        itemType: 'movie',
        searchMode: 'find',

        'config.playlists': {
          'watch sequence': { movie: [underTheSkin.$id, 'the_astronaut'] }
        }
      }
    }
  }))

  const tagsRow = page.locator(tag).locator('.tags')

  // tagging watched strips the item from the default playlist
  await tagsRow.getByRole('button', { name: 'watched' }).click()
  await expect.poll(() => sentConfigs.length).toBe(1)

  // tagging watching sets it back
  await tagsRow.getByRole('button', { name: 'watching' }).click()
  await expect.poll(() => sentConfigs.length).toBe(2)

  expect(sentConfigs).toEqual([
    { playlists: { 'watch sequence': { movie: ['the_astronaut'] } } },
    { playlists: { 'watch sequence': { movie: ['the_astronaut', underTheSkin.$id] } } }
  ])
})

test('tagging failure', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))
  await page.route('/api/save-item', route => route.fulfill({ status: 500 }))

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  await page.evaluate(componentTag => {
    const component = document.querySelector(componentTag)

    for (const eventType of ['lock', 'unlock']) {
      component.addEventListener(
        eventType,
        () => window.testContext.lockEvents.push(eventType)
      )
    }
  }, tag)

  const detailedView = page.locator(tag)
  const tagsRow = detailedView.locator('.tags')

  await tagsRow.locator('button.d3').click()

  // failure status displayed on the 3d control, which is inactive again: the tags
  // rolled back to the original item defaults (draft restored, shared inactive)
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-3d-failure'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // the meta enrichment from the lookup is rolled back too
  await expect(detailedView.locator('.movie-meta span').nth(1)).toHaveText('no classification')

  // the failed update flow is surrounded by lock/unlock events
  await expect.poll(() => page.evaluate(() => window.testContext.lockEvents))
    .toEqual(['lock', 'unlock'])
})

test('tv show seasons from seasons count', async ({ page }) => {
  let lookupPayload = detailedHilda

  await page.route('/api/lookup-items', route => route.fulfill({ json: [lookupPayload] }))

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  const tagsRow = page.locator(tag).locator('.tags')
  const seasonButtons = tagsRow.getByRole('button', { name: /^s\d+$/ })

  // s1/s2 rendered from meta.seasonsCount, locked while the show is neither
  // watching nor watched
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-seasons-locked'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  for (const seasonButton of await seasonButtons.all()) {
    await expect(seasonButton).toBeDisabled()
  }

  // reload as being watched with the s1 season tag
  lookupPayload = {
    ...detailedHilda,
    tags: ['to watch', 'tv show', 's1'],
    workspaces: ['watching']
  }

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  // s1 highlighted, s2 unlocked and inactive
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-s1-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  for (const seasonButton of await seasonButtons.all()) {
    await expect(seasonButton).toBeEnabled()
  }
})

test('tv show derived seasons', async ({ page }) => {
  // same detail as detailedHilda, minus the seasons count
  const { seasonsCount, ...seasonlessMeta } = detailedHilda.meta

  let lookupPayload = {
    ...detailedHilda,
    meta: seasonlessMeta,
    tags: ['to watch', 'tv show', 's1'],
    workspaces: ['watching']
  }

  await page.route('/api/lookup-items', route => route.fulfill({ json: [lookupPayload] }))

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  const tagsRow = page.locator(tag).locator('.tags')

  // s1 tag alone derives s1 + the next season: same row as the seasons count show
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-s1-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // reload with both seasons tagged
  lookupPayload = { ...lookupPayload, tags: ['to watch', 'tv show', 's1', 's2'] }

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  // s1/s2 highlighted and the derived s3 unlocked and inactive
  return expect(page).toHaveScreenshot(
    getScreenshotPath('tags-s1-s2-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )
})

test('season activation side effect', async ({ page }) => {
  const savedItems = []

  // seasons are only saveable alongside a follow up workspace: watching to start
  const watchingHilda = {
    ...detailedHilda,
    tags: ['to watch', 'tv show'],
    workspaces: ['watching']
  }

  await page.route('/api/lookup-items', route => route.fulfill({ json: [watchingHilda] }))

  await page.route('/api/save-item', route => {
    savedItems.push(route.request().postDataJSON())
    return route.fulfill({ json: { $id: hilda.$id } })
  })

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  const tagsRow = page.locator(tag).locator('.tags')
  const s1Button = tagsRow.getByRole('button', { name: 's1' })
  const watchedButton = tagsRow.getByRole('button', { name: 'watched' })

  await s1Button.click()

  // activating a season while watching: same row as the persisted s1 show
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-s1-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // deactivated, then the follow up switched before activating again
  await s1Button.click()
  await watchedButton.click()
  await s1Button.click()

  // the season stays active under the watched follow up
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-s1-watched-active'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  // the follow up workspace required by the api for season tags is carried through
  // untouched on every season change: never duplicated while watching, never
  // replaced by watching while watched
  expect(savedItems.map(({ tags, workspaces }) => ({ tags, workspaces }))).toEqual([
    { tags: ['to watch', 'tv show', 's1'], workspaces: ['watching'] },
    { tags: ['to watch', 'tv show'], workspaces: ['watching'] },
    { tags: ['to watch', 'tv show'], workspaces: ['watched'] },
    { tags: ['to watch', 'tv show', 's1'], workspaces: ['watched'] }
  ])
})

test('watched control visibility per tv show status', async ({ page }) => {
  const { ended, ...ongoingMeta } = detailedHilda.meta

  // still airing: the show can't be marked watched yet
  let lookupPayload = { ...detailedHilda, meta: { ...ongoingMeta, ended: false } }

  await page.route('/api/lookup-items', route => route.fulfill({ json: [lookupPayload] }))

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  const tagsRow = page.locator(tag).locator('.tags')
  const watchedButton = tagsRow.getByRole('button', { name: 'watched' })

  // follow up row reduced to watching and the locked seasons
  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-no-watched-control'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  await expect(watchedButton).toBeHidden()

  // unknown status: control back, same row as the ended show
  lookupPayload = { ...detailedHilda, meta: ongoingMeta }

  await page.goto(getComponentUrl({
    params: {
      item: hilda,
      layoutState: { itemType: 'tv show', searchMode: 'find' }
    }
  }))

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tags-seasons-locked'),
    { clip: await getPaddedBoundingBox(tagsRow, 15) }
  )

  return expect(watchedButton).toBeVisible()
})

test('playlist field focus placeholder', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')
  const savedItems = await captureRequests(page, '/api/save-item')

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const form = page.locator(tag).locator('.form')
  const playlistInput = form.locator('.playlist-field input')

  // assign placeholder, no hint
  await expect(form).toHaveScreenshot(getScreenshotPath('blank-playlist-form'))

  await expect(playlistInput).toBeEnabled()
  await playlistInput.focus()

  // the default playlist offered as the placeholder, with the enter key hint
  await expect(form).toHaveScreenshot(getScreenshotPath('focused-playlist-form'))

  await playlistInput.blur()

  // assign placeholder restored
  await expect(form).toHaveScreenshot(getScreenshotPath('blank-playlist-form'))

  // focusing the field persists nothing
  expect(sentConfigs).toEqual([])
  expect(savedItems).toEqual([])
})

test('playlist field keyboard shortcuts and clear', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')
  const savedItems = await captureRequests(page, '/api/save-item')

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const form = page.locator(tag).locator('.form')
  const playlistField = form.locator('.playlist-field')
  const playlistInput = playlistField.locator('input')
  const clearButton = playlistField.getByRole('button', { name: 'clear' })

  await expect(playlistInput).toBeEnabled()
  await expect(clearButton).toBeDisabled()

  // enter on the empty field selects the default playlist
  await playlistInput.press('Enter')

  await expect(form).toHaveScreenshot(getScreenshotPath('filled-playlist-form'))
  await expect(clearButton).toBeEnabled()

  // escape empties it again, the field still holding focus
  await playlistInput.press('Escape')

  await expect(form).toHaveScreenshot(getScreenshotPath('focused-playlist-form'))

  await playlistInput.press('Enter')

  await expect(form).toHaveScreenshot(getScreenshotPath('filled-playlist-form'))

  // clearing empties the value, which disables the control again
  await clearButton.click()
  await expect(clearButton).toBeDisabled()

  // the shortcuts and the clear control only stage the value: persistence stays
  // the save button's job
  expect(sentConfigs).toEqual([])
  expect(savedItems).toEqual([])
})

test('playlists completion list', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')
  const savedItems = await captureRequests(page, '/api/save-item')

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: {
        itemType: 'movie',
        searchMode: 'find',

        // the item belongs to none of them, leaving the field empty
        'config.playlists': {
          'watch sequence': { movie: ['the_astronaut'] },
          favorites: { movie: [vanished.$id] },
          rewatch: { 'tv show': ['hilda'] }
        }
      }
    }
  }))

  const form = page.locator(tag).locator('.form')
  const playlistInput = form.locator('.playlist-field input')
  const completion = form.locator('.completion')

  await expect(playlistInput).toBeEnabled()
  await playlistInput.focus()

  // movie playlists only ('rewatch' holds tv shows), default playlist highlighted
  await expect(page).toHaveScreenshot(
    getScreenshotPath('playlists-completion'),
    { clip: await getPaddedBoundingBox(completion, 15) }
  )

  await completion.getByRole('button', { name: 'watch sequence' }).click()

  // the clicked entry fills the field, which hides the list again
  await expect(form).toHaveScreenshot(getScreenshotPath('filled-playlist-form'))

  // no layout playlists: no list at all
  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  await expect(form).toHaveScreenshot(getScreenshotPath('blank-playlist-form'))

  await expect(playlistInput).toBeEnabled()
  await playlistInput.focus()

  // nothing to complete from, where a configured list would have shown
  await expect(form).toHaveScreenshot(getScreenshotPath('focused-playlist-form'))
  await expect(completion).toBeHidden()

  // picking an entry stages the value like the shortcuts do
  expect(sentConfigs).toEqual([])
  expect(savedItems).toEqual([])
})

test('save button labels and disabled states', async ({ page }) => {
  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: { itemType: 'movie', searchMode: 'find' }
    }
  }))

  const form = page.locator(tag).locator('.form')

  // find mode: labelled after the playlist action, disabled while it is unchanged
  await expect(form.locator('.playlist-field input')).toBeEnabled()
  await expect(form.getByRole('button', { name: 'set playlist' })).toBeDisabled()

  // add mode: labelled after the item type, disabled without a title and a url
  for (const [itemType, label] of [['movie', 'add movie'], ['tv show', 'add tv show']]) {
    await page.goto(getComponentUrl({
      params: { layoutState: { itemType, searchMode: 'add' } }
    }))

    const saveButton = form.getByRole('button', { name: label })

    await expect(saveButton).toBeDisabled()

    await expect(saveButton)
      .toHaveScreenshot(getScreenshotPath(`${label.replaceAll(' ', '-')}-button`))
  }
})

test('movie addition', async ({ page }) => {
  const { promise: saveGate, resolve: fulfillSave } = Promise.withResolvers()
  const savedItems = []

  await page.route('/api/save-item', async route => {
    savedItems.push(route.request().postDataJSON())
    await saveGate
    return route.fulfill({ json: { $id: 'items/blade_runner' } })
  })

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'movie',
        searchMode: 'add',
        search: { text: 'blade runner' }
      }
    }
  }))

  await page.evaluate(componentTag => {
    const component = document.querySelector(componentTag)

    for (const eventType of ['lock', 'unlock']) {
      component.addEventListener(
        eventType,
        () => window.testContext.lockEvents.push(eventType)
      )
    }

    component.addEventListener('add', ({ detail }) => window.testContext.addEvents.push(detail))
  }, tag)

  const detailedView = page.locator(tag)
  const tagsRow = detailedView.locator('.tags')
  const d3Button = tagsRow.locator('button.d3')
  const watchingButton = tagsRow.getByRole('button', { name: 'watching' })
  const saveButton = detailedView.getByRole('button', { name: 'add movie' })

  await detailedView.getByPlaceholder('url').fill('https://tmdb/blade_runner')
  await detailedView.locator('.playlist-field input').fill('favorites')

  // tagging an item that is not saved yet only stages the changes
  await d3Button.click()
  await watchingButton.click()

  await expect(d3Button).toContainClass('active')
  await expect(watchingButton).toContainClass('active')
  expect(savedItems).toEqual([])

  await saveButton.click()

  await expect(saveButton).toContainClass('pending')

  // every control locked while the addition is pending
  for (const control of await detailedView.locator('button, input').all()) {
    await expect(control).toBeDisabled()
  }

  fulfillSave()

  await expect(saveButton).toContainClass('success')

  // not emitted synchronously with the save
  expect(await page.evaluate(() => window.testContext.addEvents)).toEqual([])

  // success state on the control, its pending pulse still running
  await expect(saveButton).toHaveScreenshot(getScreenshotPath('add-movie-button-success'))

  // staged tags and follow up saved with the refined type/tags
  expect(savedItems).toEqual([{
    title: 'blade runner',
    url: 'https://tmdb/blade_runner',
    type: 'url',
    tags: ['draft', '3d', 'to watch', 'movie'],
    workspaces: ['watching']
  }])

  // the playlist is assigned to the id returned by the save
  expect(sentConfigs).toEqual([
    { playlists: { favorites: { movie: ['items/blade_runner'] } } }
  ])

  await page.waitForFunction(async () => {
    const { promise, resolve } = Promise.withResolvers()
    setTimeout(resolve, 3000)
    return promise
  })

  // emitted with the staged content once the 3s delay elapses: the type and the
  // refined tags are added by the save, not by the component
  await expect.poll(
    () => page.evaluate(() => window.testContext.addEvents),
    { timeout: 250 }
  ).toEqual([{
    title: 'blade runner',
    url: 'https://tmdb/blade_runner',
    tags: ['draft', '3d'],
    workspaces: ['watching']
  }])

  // one lock/unlock pair for the whole flow, the staged changes included
  return expect(page.evaluate(() => window.testContext.lockEvents))
    .resolves.toEqual(['lock', 'unlock'])
})

test('tv show addition', async ({ page }) => {
  const { promise: saveGate, resolve: fulfillSave } = Promise.withResolvers()
  const savedItems = []

  await page.route('/api/save-item', async route => {
    savedItems.push(route.request().postDataJSON())
    await saveGate
    return route.fulfill({ json: { $id: 'items/hilda' } })
  })

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'tv show',
        searchMode: 'add',
        search: { text: 'hilda' }
      }
    }
  }))

  const detailedView = page.locator(tag)
  const tagsRow = detailedView.locator('.tags')
  const watchingButton = tagsRow.getByRole('button', { name: 'watching' })
  const seasonButton = tagsRow.getByRole('button', { name: 's1' })
  const saveButton = detailedView.getByRole('button', { name: 'add tv show' })

  await detailedView.getByPlaceholder('url').fill('https://tmdb/hilda')

  // no meta on a blank form: s1 derived from an empty season list, locked until a
  // follow up workspace is set
  await expect(seasonButton).toBeDisabled()

  await watchingButton.click()
  await expect(seasonButton).toBeEnabled()

  await seasonButton.click()
  await expect(seasonButton).toContainClass('active')

  // staging a season on an unsaved item reaches no endpoint
  expect(savedItems).toEqual([])
  expect(sentConfigs).toEqual([])

  await saveButton.click()

  await expect(saveButton).toContainClass('pending')

  // the season controls are locked with the rest while the addition is pending
  await expect(seasonButton).toBeDisabled()

  for (const control of await detailedView.locator('button, input').all()) {
    await expect(control).toBeDisabled()
  }

  fulfillSave()

  await expect(saveButton).toContainClass('success')
  await expect(saveButton).toHaveScreenshot(getScreenshotPath('add-tv-show-button-success'))

  // everything staged lands in the one save the flow makes
  expect(savedItems).toEqual([{
    title: 'hilda',
    url: 'https://tmdb/hilda',
    type: 'url',
    tags: ['draft', 's1', 'to watch', 'tv show'],
    workspaces: ['watching']
  }])
})

test('playlist update', async ({ page }) => {
  const { promise: updateGate, resolve: fulfillUpdate } = Promise.withResolvers()
  const sentConfigs = []

  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  await page.route('/api/set-config/watch', async route => {
    sentConfigs.push(route.request().postDataJSON())
    await updateGate
    return route.fulfill({ json: {} })
  })

  const savedItems = await captureRequests(page, '/api/save-item')

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: {
        itemType: 'movie',
        searchMode: 'find',

        'config.playlists': {
          'watch sequence': { movie: [underTheSkin.$id, 'the_astronaut'] }
        }
      }
    }
  }))

  const detailedView = page.locator(tag)
  const d3Button = detailedView.locator('.tags button.d3')
  const form = detailedView.locator('.form')
  const saveButton = form.getByRole('button', { name: 'set playlist' })

  await form.locator('.playlist-field input').fill('favorites')
  await saveButton.click()

  await expect(saveButton).toContainClass('pending')

  // every control bound to the edit lock is disabled while the update is pending
  for (const control of await detailedView
    .locator('.tags button, .playlist-field input, .save-button').all()
  ) {
    await expect(control).toBeDisabled()
  }

  fulfillUpdate()

  await expect(saveButton).toContainClass('success')

  // the item moved out of its former playlist into the new one
  expect(sentConfigs).toEqual([{
    playlists: {
      'watch sequence': { movie: ['the_astronaut'] },
      favorites: { movie: [underTheSkin.$id] }
    }
  }])

  // controls released, save disabled again against the refreshed initial playlist
  await expect(d3Button).toBeEnabled()
  await expect(saveButton).toBeDisabled()

  await expect(saveButton).toHaveScreenshot(getScreenshotPath('set-playlist-button-success'))

  // a playlist change never saves the item
  expect(savedItems).toEqual([])
})

test('playlist update failure', async ({ page }) => {
  const sentConfigs = []

  await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

  await page.route('/api/set-config/watch', route => {
    sentConfigs.push(route.request().postDataJSON())
    return route.fulfill({ status: 500 })
  })

  const savedItems = await captureRequests(page, '/api/save-item')

  await page.goto(getComponentUrl({
    params: {
      item: underTheSkin,
      layoutState: {
        itemType: 'movie',
        searchMode: 'find',

        'config.playlists': {
          'watch sequence': { movie: [underTheSkin.$id, 'the_astronaut'] }
        }
      }
    }
  }))

  await page.evaluate(componentTag => {
    const component = document.querySelector(componentTag)

    for (const eventType of ['lock', 'unlock']) {
      component.addEventListener(
        eventType,
        () => window.testContext.lockEvents.push(eventType)
      )
    }
  }, tag)

  const detailedView = page.locator(tag)
  const d3Button = detailedView.locator('.tags button.d3')
  const form = detailedView.locator('.form')
  const saveButton = form.getByRole('button', { name: 'set playlist' })

  await form.locator('.playlist-field input').fill('favorites')
  await saveButton.click()

  await expect(saveButton).toContainClass('failure')
  await expect(saveButton).toHaveScreenshot(getScreenshotPath('set-playlist-button-failure'))

  // the assignment was attempted once, and the item itself was never saved
  expect(sentConfigs).toHaveLength(1)
  expect(savedItems).toEqual([])

  // controls released and the save still enabled: the initial playlist was not
  // refreshed, so the change can be retried
  await expect(d3Button).toBeEnabled()
  await expect(saveButton).toBeEnabled()

  // the failed flow is still surrounded by lock/unlock
  return expect.poll(() => page.evaluate(() => window.testContext.lockEvents))
    .toEqual(['lock', 'unlock'])
})

test('save failure', async ({ page }) => {
  const savedItems = []

  await page.route('/api/save-item', route => {
    savedItems.push(route.request().postDataJSON())
    return route.fulfill({ status: 500 })
  })

  const sentConfigs = await captureRequests(page, '/api/set-config/watch')

  await page.goto(getComponentUrl({
    params: {
      layoutState: {
        itemType: 'movie',
        searchMode: 'add',
        search: { text: 'blade runner' }
      }
    }
  }))

  await page.evaluate(componentTag => {
    const component = document.querySelector(componentTag)

    for (const eventType of ['lock', 'unlock']) {
      component.addEventListener(
        eventType,
        () => window.testContext.lockEvents.push(eventType)
      )
    }

    component.addEventListener('add', ({ detail }) => window.testContext.addEvents.push(detail))
  }, tag)

  const detailedView = page.locator(tag)
  const saveButton = detailedView.getByRole('button', { name: 'add movie' })

  await detailedView.getByPlaceholder('url').fill('https://tmdb/blade_runner')
  await detailedView.locator('.playlist-field input').fill('favorites')

  await saveButton.click()

  await expect(saveButton).toContainClass('failure')
  await expect(saveButton).toHaveScreenshot(getScreenshotPath('add-movie-button-failure'))

  // the attempt was made, and it aborted before the playlist assignment
  expect(savedItems).toHaveLength(1)
  expect(sentConfigs).toEqual([])

  // controls released with the entered content kept, so the save can be retried
  await expect(saveButton).toBeEnabled()

  // the failed flow is still surrounded by lock/unlock
  await expect.poll(() => page.evaluate(() => window.testContext.lockEvents))
    .toEqual(['lock', 'unlock'])

  await page.waitForFunction(async () => {
    const { promise, resolve } = Promise.withResolvers()
    setTimeout(resolve, 5000)
    return promise
  })

  // no add event: the 3s timer is only scheduled on success
  expect(await page.evaluate(() => window.testContext.addEvents)).toEqual([])
})

test.describe('on narrow viewport', () => {
  // below 450px: poster stacked full width, single column form, save label dropped,
  // the save control hidden while the empty playlist field holds focus, and both the
  // tags row and the follow up row wrapped over several lines
  test.use({ viewport: { width: 375, height: 667 } })

  test('narrow display', async ({ page }) => {
    await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

    await page.goto(getComponentUrl({
      params: {
        item: underTheSkin,
        layoutState: { itemType: 'movie', searchMode: 'find' }
      }
    }))

    return expect(page.locator(tag)).toHaveScreenshot(getScreenshotPath('detail-narrow'))
  })

  test('narrow tv show follow up wrapping', async ({ page }) => {
    // four seasons: the follow up row cannot fit on one line
    const fourSeasonsHilda = {
      ...detailedHilda,
      meta: { ...detailedHilda.meta, seasonsCount: 4 }
    }

    await page.route('/api/lookup-items', route => route.fulfill({ json: [fourSeasonsHilda] }))

    await page.goto(getComponentUrl({
      params: {
        item: hilda,
        layoutState: { itemType: 'tv show', searchMode: 'find' }
      }
    }))

    const tagsRow = page.locator(tag).locator('.tags')

    // the stacked card pushes the tags row below the fold
    await tagsRow.scrollIntoViewIfNeeded()

    // watching, s1 to s4 and watched wrapped under the depth and visibility groups
    return expect(page).toHaveScreenshot(
      getScreenshotPath('tags-seasons-narrow'),
      { clip: await getPaddedBoundingBox(tagsRow, 15) }
    )
  })

  test('narrow playlist field focus', async ({ page }) => {
    await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

    await page.goto(getComponentUrl({
      params: {
        item: underTheSkin,
        layoutState: { itemType: 'movie', searchMode: 'find' }
      }
    }))

    const form = page.locator(tag).locator('.form')
    const playlistInput = form.locator('.playlist-field input')
    const saveButton = form.getByRole('button', { name: 'set playlist' })

    await expect(playlistInput).toBeEnabled()
    await expect(saveButton).toBeVisible()

    await playlistInput.focus()

    // no completion list to make room for: the save control stays put
    await expect(saveButton).toBeVisible()
    await expect(form).toHaveScreenshot(getScreenshotPath('focused-playlist-form-narrow'))

    await playlistInput.blur()

    return expect(saveButton).toBeVisible()
  })

  test('narrow playlist completion', async ({ page }) => {
    await page.route('/api/lookup-items', route => route.fulfill({ json: [detailedUnderTheSkin] }))

    await page.goto(getComponentUrl({
      params: {
        item: underTheSkin,
        layoutState: {
          itemType: 'movie',
          searchMode: 'find',

          // the item belongs to none of them, leaving the field empty
          'config.playlists': {
            'watch sequence': { movie: ['the_astronaut'] },
            favorites: { movie: [vanished.$id] }
          }
        }
      }
    }))

    const form = page.locator(tag).locator('.form')
    const playlistInput = form.locator('.playlist-field input')
    const completion = form.locator('.completion')
    const saveButton = form.getByRole('button', { name: 'set playlist' })

    await expect(playlistInput).toBeEnabled()
    await expect(saveButton).toBeVisible()
    await expect(completion).toBeHidden()

    await playlistInput.focus()

    // the completion list takes the save control's place
    await expect(completion).toBeVisible()
    await expect(saveButton).toBeHidden()

    await form.scrollIntoViewIfNeeded()

    // the completion list is absolutely positioned, hence outside the form box
    await expect(page).toHaveScreenshot(
      getScreenshotPath('narrow-playlist-completion'),
      { clip: await getClip({ locators: [form, completion], expanse: 15 }) }
    )

    await playlistInput.blur()

    return expect(saveButton).toBeVisible()
  })
})

async function captureRequests (page, endpoint) {
  const payloads = []

  await page.route(endpoint, route => {
    payloads.push(route.request().postDataJSON())
    return route.fulfill({ json: {} })
  })

  return payloads
}
