import { test as testBase, expect } from '@playwright/test'
import { getComponentHelpers } from '../../../helpers/components.js'
import { createCountListener } from '../../../helpers/route.js'
import { readFileSync } from 'fs'

const test = testBase.extend({
  async lastItems ({ page }, use) {
    const serializedItems = readFileSync('./tests/fixtures/dashboard/last_items.json')
    const lastItems = JSON.parse(serializedItems)
    use(lastItems)
  },

  async config ({ page }, use) {
    const serializedConfig = readFileSync('./tests/fixtures/dashboard/config.json')
    const config = JSON.parse(serializedConfig)
    use(config)
  }
})

const layout = 'dashboard'
const component = 'body'

const workspaces = [
  'tech survey',
  'escape',
  'health survey',
  'books followup',
  'house survey',
  'heroku like',
  'job survey',
  'home support',
  'synonym search',
  'proxy services',
  'starfields',
  'julia survey',
  'graphic survey',
  'game survey',
  'devops dashboard',
  'music discovery',
  'droplets conf'
]

const {
  getComponentUrl,
  getScreenshotPath
} = getComponentHelpers({ layout, component })

test('body loading last items', async ({ page }) => {
  await page.route('/api/find-items', () => {})
  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('loading-last-items'))
})

test('body loading pined', async ({ page, lastItems, config }) => {
  await page.route('/api/find-items', () => {})

  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems }),
    { times: 1 }
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config }),
    { times: 1 }
  )

  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('loading-pined'))
})

test('body loaded', async ({ page, lastItems, config }) => {
  const itemsLoadSequences = [
    [5, 1, 7, 3, 4, 0],
    [2, 1, 3, 7],
    [0, 1, 2, 5, 3, 6, 7],
    Array.from({ length: lastItems.length }, (value, index) => index)
  ]

  for (const itemLoadSequence of itemsLoadSequences) {
    await page.route(
      '/api/find-items',
      route => route.fulfill({ json: itemLoadSequence.map(index => lastItems[index]) }),
      { times: 1 }
    )
  }

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config }),
    { times: 1 }
  )

  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('loaded'))
})

test('widget addition', async ({ page, lastItems, config }) => {
  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems })
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config }),
    { times: 1 }
  )

  await page.goto(getComponentUrl())

  {
    const modalArgs = page.evaluate(() => new Promise(resolve => {
      window.addEventListener('set-modal', ({ detail }) => resolve(detail))
    }))

    await page.getByTitle('Pin a workspace').click()

    await expect(modalArgs).resolves.toEqual([expect.objectContaining({
      component: 'hdl-dashboard-workspace-finder',

      params: {
        title: 'pick a workspace',
        workspaces
      },

      paramsHaveAccessors: true,
      type: 'web-component'
    })])
  }

  {
    let fullfillSentConfigData
    const sentConfigData = new Promise(resolve => { fullfillSentConfigData = resolve })

    await page.route(
      '/api/set-config/dashboard',

      route => {
        fullfillSentConfigData(route.request().postDataJSON())

        route.fulfill({
          contentType: 'text/plain',
          body: 'config successfully set'
        })
      },

      { times: 1 }
    )

    const modalArgs = page.evaluate(() => new Promise(resolve => {
      window.addEventListener('set-modal', ({ detail }) => resolve(detail))
    }))

    await page.evaluate(() => {
      window.mockModal.mount()
      window.mockModal.element.dispatchEvent(new window.CustomEvent('pin', { detail: 'starfields' }))
    })

    await expect(sentConfigData).resolves.toEqual({
      pined: [
        'pending',
        'comics followup',
        'fuzzy search',
        'starfields'
      ]
    })

    return expect(modalArgs).resolves.toEqual([])
  }
})

test('widget removal', async ({ page, lastItems, config }) => {
  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems })
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config }),
    { times: 1 }
  )

  await page.goto(getComponentUrl())

  const widget = await page.locator('css=.pined', {
    has: page.getByRole('heading', { name: 'pending' })
  })

  await widget.hover()

  let fullfillSentConfigData
  const sentConfigData = new Promise(resolve => { fullfillSentConfigData = resolve })

  await page.route(
    '/api/set-config/dashboard',

    route => {
      fullfillSentConfigData(route.request().postDataJSON())

      route.fulfill({
        contentType: 'text/plain',
        body: 'config successfully set'
      })
    },

    { times: 1 }
  )

  await widget.getByTitle('Unpin workspace').click()

  return expect(sentConfigData).resolves.toEqual({
    pined: ['comics followup', 'fuzzy search']
  })
})

test('notifications', async ({ page, lastItems, config }) => {
  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems })
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config })
  )

  const initialLoad = Promise.all([
    page.waitForResponse(createCountListener('/api/find-items', 4)),
    page.waitForResponse('/api/get-config/dashboard')
  ])

  await page.goto(getComponentUrl())
  await initialLoad

  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems.slice(0, 3) })
  )

  const itemsUpdate = page.waitForResponse(createCountListener('/api/find-items', 4))

  await page.evaluate(() => {
    const listeners = window.mockSse.subscriptions['/api/user-janouma/notification']

    for (const listener of listeners) {
      listener({ type: 'itemsUpdate' })
    }
  })

  await itemsUpdate
  await expect(page).toHaveScreenshot(getScreenshotPath('notifications', 'items-update'))

  await page.route(
    '/api/get-config/dashboard',

    route => route.fulfill({
      json: { pined: ['comics followup', 'fuzzy search'] }
    })
  )

  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems.slice(3, 7) })
  )

  const pinedUpdate = Promise.all([
    page.waitForResponse(createCountListener('/api/find-items', 2)),
    page.waitForResponse('/api/get-config/dashboard')
  ])

  await page.evaluate(() => {
    const listeners = window.mockSse.subscriptions['/api/user-janouma/notification/dashboard']

    for (const listener of listeners) {
      listener({ type: 'configUpdate' })
    }
  })

  await pinedUpdate
  return expect(page).toHaveScreenshot(getScreenshotPath('notifications', 'pined-update'))
})

test('reconnection', async ({ page, lastItems, config }) => {
  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems })
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config })
  )

  const initialLoad = Promise.all([
    page.waitForResponse(createCountListener('/api/find-items', 4)),
    page.waitForResponse('/api/get-config/dashboard')
  ])

  await page.goto(getComponentUrl())
  await initialLoad

  await page.route(
    '/api/get-config/dashboard',

    route => route.fulfill({
      json: { pined: ['comics followup', 'fuzzy search'] }
    })
  )

  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems.slice(3, 7) })
  )

  const updates = Promise.all([
    page.waitForResponse(createCountListener('/api/find-items', 2)),
    page.waitForResponse('/api/get-config/dashboard')
  ])

  await page.evaluate(() => {
    for (const listener of window.mockSse.connectListeners) {
      listener()
    }
  })

  await updates
  return expect(page).toHaveScreenshot(getScreenshotPath('reconnection'))
})

test('widget count limit', async ({ page, lastItems }) => {
  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems })
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({
      json: {
        pined: [
          'books followup',
          'comics followup',
          'house survey',
          'heroku like'
        ]
      }
    })
  )

  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('max-widget-reached'))
})

test('workspaces limit', async ({ page, lastItems, config }) => {
  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems })
  )

  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: config })
  )

  await page.goto(getComponentUrl())

  const workspaces = config.pined.map(name => `{name:'${name}'}`)

  await page.addScriptTag({
    type: 'module',

    content: `
      import { state } from '../../../../helpers/layout_context.js'
      state.workspaces.set([${workspaces.join(',')}])
    `
  })

  return expect(page).toHaveScreenshot(getScreenshotPath('no-more-workspace'))
})
