import { test as testBase, expect } from '../../../helpers/playwright.js'
import { readFileSync } from 'fs'
import { getComponentHelpers } from '../../../helpers/components.js'

const test = testBase.extend({
  async lastItems ({ page }, use) {
    const serializedItems = readFileSync('./tests/fixtures/dashboard/last_items.json')
    const lastItems = JSON.parse(serializedItems)
    use(lastItems)
  }
})

const layout = 'dashboard'
const component = 'search_builder'

const {
  getComponentUrl,
  getScreenshotPath
} = getComponentHelpers({ layout, component })

test.beforeEach(({ page }) => page.route(
  '/shared_components/loading_animation/assets/images/loading.svg',

  route => route
    .fulfill({ path: 'tests/suites/dashboard/search_builder/views/assets_fixtures/images/loading.svg' })
))

test.describe('desktop', () => {
  test.use({ viewport: { width: 1080, height: 1080 } })

  test('default search pin', async ({ page, lastItems }) => {
    const title = 'recently added'

    let setRoute
    const apiCall = new Promise(resolve => { setRoute = resolve })

    await page.route('/api/find-items', setRoute)
    await page.goto(getComponentUrl())
    await page.locator('loading-animation').waitFor()
    await expect(page).toHaveScreenshot(getScreenshotPath('initial-loading'))

    const findItemsRoute = await apiCall

    expect(JSON.parse(findItemsRoute.request().postData())).toEqual({
      connectees: [], includeDraft: false, max: 20, tags: []
    })

    await findItemsRoute.fulfill({ json: [...lastItems, ...lastItems.slice(0, 5)] })
    await expect(page).toHaveScreenshot(getScreenshotPath('initial-loaded'))

    await page.getByPlaceholder('name your search').fill(title)
    await expect(page.getByRole('heading', { name: 'name your search' }))
      .toHaveScreenshot(getScreenshotPath('filled-title'))

    const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
      searchBuilder => new Promise(
        resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail))
      )
    )

    await page.getByRole('button', { name: 'pin' }).click()

    return expect(pinEventDetail)
      .resolves.toEqual({ search: { connectees: [], includeDraft: false, max: 20, tags: [] }, title })
  })

  test('title validation', async ({ page }) => {
    await page.goto(getComponentUrl())

    const titleInput = await page.getByPlaceholder('name your search')
    const submit = await page.getByRole('button', { name: 'pin' })
    await expect(submit).toBeDisabled()

    await titleInput.fill('   re   ')
    await expect(titleInput).toHaveScreenshot(getScreenshotPath('invalid-title'))
    await expect(submit).toBeDisabled()

    await titleInput.fill('r   e')
    await expect(titleInput).toHaveScreenshot(getScreenshotPath('valid-title'))
    await expect(submit).toBeEnabled()
    return expect(submit).toHaveScreenshot(getScreenshotPath('enabled-submit'))
  })

  test('workspace selection', async ({ page, lastItems }) => {
    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: lastItems })
    )

    await page.goto(getComponentUrl())

    const title = 'books'
    const previewTitle = await page.getByRole('heading', { name: 'preview' })
    const preview = await previewTitle.locator(':scope + *')
    const loading = await page.locator('loading-animation')
    const draftSwitch = await page.getByLabel('drafts')
    const folderBrowser = await page.locator('folder-browser')
    const searchBar = await page.locator('search-bar')

    await folderBrowser.click()

    {
      let setRoute
      const apiCall = new Promise(resolve => { setRoute = resolve })
      await page.route('/api/find-items', setRoute)

      const selectedWorkspace = 'books followup'
      await folderBrowser.getByText(selectedWorkspace).click()

      const findItemsRoute = await apiCall

      expect(JSON.parse(findItemsRoute.request().postData())).toEqual({
        connectees: [], includeDraft: true, max: 20, tags: [], workspace: selectedWorkspace
      })

      await expect(folderBrowser.evaluate(node => node.selected))
        .resolves.toBe(selectedWorkspace)

      await expect(searchBar.evaluate(node => node.searching)).resolves.toBe(true)

      await expect(draftSwitch)
        .toHaveScreenshot(getScreenshotPath('enabled-drafts-switch'))

      await expect(draftSwitch.evaluate(node => node.disabled)).resolves.toBe(true)

      await loading.waitFor()

      await findItemsRoute.fulfill({ json: lastItems.slice(0, 3) })

      await expect(searchBar.evaluate(node => node.searching)).resolves.toBe(false)

      await expect(preview)
        .toHaveScreenshot(getScreenshotPath('loaded-workspace-preview'))

      await page.getByPlaceholder('name your search').fill(title)

      const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
        searchBuilder => new Promise(
          resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail))
        )
      )

      await page.getByRole('button', { name: 'pin' }).click()

      await expect(pinEventDetail)
        .resolves.toEqual({
          search: {
            connectees: [],
            includeDraft: false,
            max: 20,
            tags: [],
            workspace: selectedWorkspace
          },
          title
        })
    }

    await folderBrowser.click()

    {
      let setRoute
      const apiCall = new Promise(resolve => { setRoute = resolve })
      await page.route('/api/find-items', setRoute)

      await folderBrowser.getByText('books followup').click()

      const findItemsRoute = await apiCall

      expect(JSON.parse(findItemsRoute.request().postData())).toEqual({
        connectees: [], includeDraft: false, max: 20, tags: []
      })

      await expect(folderBrowser.evaluate(node => node.selected))
        .resolves.toBeNull()

      await expect(draftSwitch)
        .toHaveScreenshot(getScreenshotPath('disabled-drafts-switch'))

      await expect(draftSwitch.evaluate(node => node.disabled)).resolves.toBe(false)

      await loading.waitFor()

      await findItemsRoute.fulfill({ json: lastItems })

      return expect(preview)
        .toHaveScreenshot(getScreenshotPath('loaded-default-search-preview'))
    }
  })

  test('draft switch', async ({ page, lastItems }) => {
    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: lastItems })
    )

    await page.goto(getComponentUrl())

    const draftSwitch = await page.getByLabel('drafts')
    const folderBrowser = await page.locator('folder-browser')
    const previewTitle = await page.getByRole('heading', { name: 'preview' })
    const preview = await previewTitle.locator(':scope + *')
    const loading = await page.locator('loading-animation')
    const selectedWorkspace = 'books followup'

    {
      let setRoute
      const title = 'drafts'
      const apiCall = new Promise(resolve => { setRoute = resolve })
      await page.route('/api/find-items', setRoute)

      draftSwitch.click()

      await expect(draftSwitch)
        .toHaveScreenshot(getScreenshotPath('checked-drafts-switch'))

      const findItemsRoute = await apiCall

      expect(JSON.parse(findItemsRoute.request().postData())).toEqual({
        connectees: [], includeDraft: true, max: 20, tags: []
      })

      await loading.waitFor()

      await findItemsRoute.fulfill({ json: lastItems })

      await expect(preview)
        .toHaveScreenshot(getScreenshotPath('loaded-default-search-preview'))

      await page.getByPlaceholder('name your search').fill(title)

      await page.route(
        '/api/find-items',
        route => route.fulfill({ json: lastItems })
      )

      await folderBrowser.click()
      await folderBrowser.getByText(selectedWorkspace).click()

      await expect(draftSwitch)
        .toHaveScreenshot(getScreenshotPath('enabled-drafts-switch'))

      const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
        searchBuilder => new Promise(
          resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail))
        )
      )

      await page.getByRole('button', { name: 'pin' }).click()

      await expect(pinEventDetail)
        .resolves.toEqual({
          search: {
            connectees: [],
            includeDraft: true,
            max: 20,
            tags: [],
            workspace: selectedWorkspace
          },
          title
        })
    }

    await folderBrowser.click()
    await folderBrowser.getByText(selectedWorkspace).click()

    {
      let setRoute
      const apiCall = new Promise(resolve => { setRoute = resolve })

      await page.route('/api/find-items', setRoute)

      draftSwitch.click()

      await expect(draftSwitch)
        .toHaveScreenshot(getScreenshotPath('disabled-drafts-switch'))

      const findItemsRoute = await apiCall

      expect(JSON.parse(findItemsRoute.request().postData())).toEqual({
        connectees: [], includeDraft: false, max: 20, tags: []
      })

      await loading.waitFor()

      await findItemsRoute.fulfill({ json: lastItems })

      return expect(preview)
        .toHaveScreenshot(getScreenshotPath('loaded-default-search-preview'))
    }
  })

  test('limits', async ({ page, lastItems }) => {
    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: lastItems })
    )

    await page.goto(getComponentUrl())

    const previewTitle = await page.getByRole('heading', { name: 'preview' })
    const preview = await previewTitle.locator(':scope + *')
    const loading = await page.locator('loading-animation')
    const title = 'limited'
    let setRoute

    const apiCall = new Promise(resolve => { setRoute = resolve })

    await page.route('/api/find-items', setRoute)

    const limitInputWrapper = await page.locator('.max-wrapper')
    const limitInput = await limitInputWrapper.getByLabel('limit')
    await limitInput.evaluate(node => { node.value = 40 })
    await limitInput.dispatchEvent('input')

    await expect(limitInputWrapper)
      .toHaveScreenshot(getScreenshotPath('limits-range'))

    const findItemsRoute = await apiCall

    expect(JSON.parse(findItemsRoute.request().postData())).toEqual({
      connectees: [], includeDraft: false, max: 40, tags: []
    })

    await loading.waitFor()

    await findItemsRoute.fulfill({ json: lastItems })

    await expect(preview)
      .toHaveScreenshot(getScreenshotPath('loaded-default-search-preview'))

    await page.getByPlaceholder('name your search').fill(title)

    const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
      searchBuilder => new Promise(
        resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail))
      )
    )

    await page.getByRole('button', { name: 'pin' }).click()

    return expect(pinEventDetail)
      .resolves.toEqual({
        search: {
          connectees: [],
          includeDraft: false,
          max: 40,
          tags: []
        },
        title
      })
  })

  test('free search', async ({ page, lastItems }) => {
    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: lastItems })
    )

    await page.goto(getComponentUrl())

    const searchBar = await page.locator('search-bar')
    const searchInput = await searchBar.getByRole('textbox')
    const previewTitle = await page.getByRole('heading', { name: 'preview' })
    const preview = await previewTitle.locator(':scope + *')
    const loading = await page.locator('loading-animation')
    const title = 'lightening'
    let setRoute
    let apiCall = new Promise(resolve => { setRoute = resolve })

    await page.route('/api/find-items', setRoute)

    searchInput.fill('java')
    await searchBar.getByText('javascript').click()
    await loading.waitFor()

    let findItemsRoute = await apiCall
    await findItemsRoute.fulfill({ json: [] })

    apiCall = new Promise(resolve => { setRoute = resolve })
    await page.route('/api/find-items', setRoute)

    searchInput.fill('anou')
    await searchBar.getByText('zanou').click()
    await loading.waitFor()

    findItemsRoute = await apiCall
    await findItemsRoute.fulfill({ json: [] })

    apiCall = new Promise(resolve => { setRoute = resolve })
    await page.route('/api/find-items', setRoute)
    searchInput.fill('light')
    await loading.waitFor()

    findItemsRoute = await apiCall

    const search = {
      connectees: ['user-janouma'],
      includeDraft: false,
      max: 20,
      tags: ['javascript'],
      text: 'light'
    }

    expect(JSON.parse(findItemsRoute.request().postData())).toEqual(search)

    await findItemsRoute.fulfill({ json: lastItems })

    await expect(preview)
      .toHaveScreenshot(getScreenshotPath('loaded-default-search-preview'))

    await page.getByPlaceholder('name your search').fill(title)

    const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
      searchBuilder => new Promise(
        resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail))
      )
    )

    await page.getByRole('button', { name: 'pin' }).click()

    return expect(pinEventDetail).resolves.toEqual({ search, title })
  })

  test('draft tag', async ({ page, lastItems }) => {
    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: lastItems })
    )

    await page.goto(getComponentUrl())

    const title = 'drafts'
    const searchBar = await page.locator('search-bar')
    const searchInput = await searchBar.getByRole('textbox')
    const draftSwitch = await page.getByLabel('drafts')

    searchInput.fill('dra')
    await searchBar.getByText('draft').click()

    await expect(draftSwitch)
      .toHaveScreenshot(getScreenshotPath('enabled-drafts-switch'))

    await expect(draftSwitch.evaluate(node => node.disabled)).resolves.toBe(true)

    await page.getByPlaceholder('name your search').fill(title)

    {
      const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
        searchBuilder => new Promise(
          resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail), { once: true })
        )
      )

      await page.getByRole('button', { name: 'pin' }).click()

      await expect(pinEventDetail)
        .resolves.toEqual({
          search: {
            connectees: [],
            includeDraft: false,
            max: 20,
            tags: ['draft']
          },
          title
        })
    }

    const draftTag = await searchBar.locator('word-tag')
    await draftTag.hover({ force: true })
    await draftTag.getByRole('button').click()

    await expect(draftSwitch)
      .toHaveScreenshot(getScreenshotPath('disabled-drafts-switch'))

    await expect(draftSwitch.evaluate(node => node.disabled)).resolves.toBe(false)

    {
      const pinEventDetail = page.locator('hdl-dashboard-search-builder').evaluate(
        searchBuilder => new Promise(
          resolve => searchBuilder.addEventListener('pin', ({ detail }) => resolve(detail), { once: true })
        )
      )

      await page.getByRole('button', { name: 'pin' }).click()

      return expect(pinEventDetail)
        .resolves.toEqual({
          search: {
            connectees: [],
            includeDraft: false,
            max: 20,
            tags: []
          },
          title
        })
    }
  })
})

test.describe('resized desktop', () => {
  test.use({ viewport: { width: 1080, height: 720 } })

  test('preview scroll', async ({ page, lastItems }) => {
    const itemsData = [...lastItems, ...lastItems]

    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: itemsData })
    )

    await page.goto(getComponentUrl())

    const previewTitle = await page.getByRole('heading', { name: 'preview' })
    const preview = await previewTitle.locator(':scope + *')
    const items = await preview.getByRole('listitem')
    await items.first().waitFor()

    await expect(preview)
      .toHaveScreenshot(getScreenshotPath('unscrolled-preview'))

    await items.nth(itemsData.length - 1).scrollIntoViewIfNeeded()

    await expect(preview)
      .toHaveScreenshot(getScreenshotPath('scrolled-preview'))
  })
})
