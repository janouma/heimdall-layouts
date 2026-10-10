import { test, expect, getClip } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'watch'
const component = 'header'

const {
  getComponentUrl,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

test('default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  await expect(page.locator('body')).toHaveScreenshot(getScreenshotPath('default'))

  const wordTags = page.locator('word-tag')

  for (const wordTag of await wordTags.all()) {
    await expect(wordTag).toHaveJSProperty('readonly', true)
  }
})

test('item type control activation', async ({ page }) => {
  await page.goto(getComponentUrl())

  const tvShowControl = page.getByTitle('show tv shows')
  await tvShowControl.click()
  return expect(tvShowControl).toHaveScreenshot(getScreenshotPath('active-tv-show-control'))
})

test('controls display on resize', async ({ page }) => {
  await page.goto(getComponentUrl())
  page.setViewportSize({ width: 375, height: 667 })
  return expect(page.locator('body')).toHaveScreenshot(getScreenshotPath('mini-screen'))
})

test.describe('on mini screen', () => {
  // below --mini-screen (812px): no controls padding, search bar wrapped full width
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true
  })

  test('mini screen display', async ({ page }) => {
    await page.goto(getComponentUrl())
    return expect(page.locator('body')).toHaveScreenshot(getScreenshotPath('mini-screen'))
  })
})

test.describe('on small screen', () => {
  // between --mini-screen (812px) and --small-screen (1024px):
  // controls padding applied, search bar still wrapped full width
  test.use({ viewport: { width: 900, height: 667 } })

  test('small screen display', async ({ page }) => {
    await page.goto(getComponentUrl())
    return expect(page.locator('body')).toHaveScreenshot(getScreenshotPath('small-screen'))
  })
})

test('layout state update by search', async ({ page }) => {
  await page.goto(getComponentUrl())

  const searchBar = page.locator('search-bar')

  await expect(searchBar).toHaveJSProperty('user', { $id: 'user-janouma', username: 'zanou@mail.com' })

  const connections = [
    { $id: 'user-audie', username: 'audie@mail.com' },
    { $id: 'user-roger', username: 'roger@mail.com' }
  ]

  await expect(searchBar).toHaveJSProperty('connections', connections)

  const searchField = searchBar.getByRole('textbox', { name: '|' })
  await searchField.fill('-jane doe audie')
  const connecteeCompletion = searchBar.getByText('audie')
  await connecteeCompletion.click()

  await expect.poll(() => getLayoutState(page, 'search')).toMatchObject({
    connectees: ['user-audie'],
    includeDraft: true,
    max: 200,
    offset: 0,
    tags: [],
    text: '-jane doe',
    workspace: ''
  })

  const searchModeToggle = page.getByRole('button', { name: 'add movie' })
  await searchModeToggle.click()
  await expect(page.locator('.controls')).toHaveScreenshot(getScreenshotPath('add-search-mode-controls'))

  await expect.poll(() => getLayoutState(page, 'search')).toMatchObject({ connectees: [] })
  expect(await getLayoutState(page, 'searchMode')).toBe('add')
  await expect(searchBar).toHaveJSProperty('connections', undefined)
  await expect(searchBar).toHaveJSProperty('negatable', false)

  await expect(searchBar).toHaveJSProperty(
    'search',
    {
      connectees: [],
      includeDraft: true,
      max: 200,
      offset: 0,
      tags: [],
      text: '-jane doe',
      workspace: ''
    }
  )

  await searchField.fill('john doe')

  await expect.poll(() => getLayoutState(page, 'search'))
    .toMatchObject({ text: 'john doe' })

  await searchModeToggle.click()
  await expect(page.locator('.controls')).toHaveScreenshot(getScreenshotPath('find-search-mode-controls'))

  await expect.poll(() => getLayoutState(page, 'search')).toMatchObject({ connectees: ['user-audie'] })
  expect(await getLayoutState(page, 'searchMode')).toBe('find')
  await expect(searchBar).toHaveJSProperty('connections', connections)
  return expect(searchBar).toHaveJSProperty('negatable', true)
})

test('layout state external update', async ({ page }) => {
  await page.goto(getComponentUrl())

  await setLayoutState(page, {
    config: {
      playlists: {
        'watch sequence': {
          movie: ['under_the_skin', 'the_astronaut', 'the_summit_of_the_gods', 'luther_fallen_sun', 'unknown_poster_id']
        },
        rewatch: {
          movie: ['top_gun_maverick', 'eyes_wide_shut']
        },
        'backup series': {
          'tv show': ['blow_out', 'hilda', 'ballerina']
        }
      }
    },

    search: {
      connectees: [],
      includeDraft: true,
      max: 200,
      offset: 0,
      tags: [],
      text: '-jane doe',
      workspace: ''
    },

    itemsCount: 14,
    searchMode: 'add',
    selectedPlaylist: 'rewatch'
  })

  await setLayoutState(page, { itemType: 'tv show' })

  const body = page.locator('body')
  await expect(body).toHaveScreenshot(getScreenshotPath('add-preset-state'))

  await setLayoutState(page, {
    searchMode: 'find',
    'search.connectees': ['user-roger'],
    selectedPlaylist: 'rewatch'
  })

  await expect(body).toHaveScreenshot(getScreenshotPath('find-preset-state'))

  const folderBrowser = page.locator('folder-browser')
  const playlistElt = folderBrowser.getByRole('list')
  const playlistsFolder = folderBrowser.getByRole('button')

  await playlistsFolder.click()
  await playlistElt.waitFor()

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tv-show-playlists'),
    { clip: await getClip({ locators: [folderBrowser, playlistElt] }) }
  )

  await setLayoutState(page, { selectedPlaylist: 'backup series' })

  await expect(page).toHaveScreenshot(
    getScreenshotPath('tv-show-selected-playlist'),
    { clip: await getClip({ locators: [folderBrowser, playlistElt] }) }
  )

  await setLayoutState(page, { 'config.playlists': { 'backup series': null } })

  return expect(folderBrowser).toHaveScreenshot(
    getScreenshotPath('tv-show-no-playlist'),
    { clip: await getClip({ locators: [folderBrowser, playlistElt] }) }
  )
})

test('layoutContext state update', async ({ page }) => {
  await page.goto(getComponentUrl())

  const newConnections = [{ $id: 'user-lw', username: 'lw@mail.com' }]
  await setLayoutContextState(page, 'connections', newConnections)

  const newSession = { user: { $id: 'user-john', username: 'doe@mail.com' } }
  await setLayoutContextState(page, 'session', newSession)

  const searchBar = page.locator('search-bar')
  await expect(searchBar).toHaveJSProperty('connections', newConnections)
  return expect(searchBar).toHaveJSProperty('user', newSession.user)
})

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

const setLayoutContextState = (page, key, value) => page.locator(tag)
  .evaluate(
    (element, [prop, newValue]) => element.layoutContext.state[prop].set(newValue),
    [key, value]
  )
