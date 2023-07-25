import { test as testBase, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { getComponentHelpers } from '../../../helpers/components.js'
import { createCountListener } from '../../../helpers/route.js'

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

const {
  getComponentUrl,
  getScreenshotPath
} = getComponentHelpers({ layout, component })

test('body without pined', async ({ page, config }) => {
  await page.route(
    '/api/get-config/dashboard',
    route => route.fulfill({ json: { pined: [], version: 1 } }),
    { times: 1 }
  )

  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('no-pined'))
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

    await page.getByTitle('Pin a search').click()

    await expect(modalArgs).resolves.toEqual([expect.objectContaining({
      component: 'hdl-dashboard-search-builder',
      type: 'web-component',
      paramsHaveAccessors: true,
      params: {
        messages: {
          titlePlaceholder: 'name your search',
          drafts: 'drafts',
          limit: 'limit',
          iconalt: 'Icon for item',
          preview: 'preview',
          noPreview: 'your search didn’t yield any items',
          searching: 'searching ...',
          pin: 'pin',
          searchBar: {
            // eslint-disable-next-line no-template-curly-in-string
            searchNItems: '${count} items found'
          }
        },
        workspaces: [
          'tech survey',
          'pending',
          'escape',
          'health survey',
          'books followup',
          'comics followup',
          'house survey',
          'heroku like',
          'job survey',
          'home support',
          'synonym search',
          'proxy services',
          'fuzzy search',
          'starfields',
          'julia survey',
          'graphic survey',
          'game survey',
          'devops dashboard',
          'music discovery',
          'droplets conf'
        ],
        tags: [
          {
            name: 'javascript'
          },
          {
            name: 'html'
          },
          {
            name: 'css'
          },
          {
            name: 'lib'
          },
          {
            name: 'cheat sheet'
          },
          {
            name: 'draft'
          }
        ],
        tagaliases: {
          js: 'javascript',
          html5: 'html',
          'html 5': 'html',
          css3: 'css',
          'css 3': 'css',
          library: 'lib'
        },
        connections: [
          {
            $id: 'user-audie',
            username: 'audie@mail.com'
          },
          {
            $id: 'user-roger',
            username: 'roger@mail.com'
          }
        ],
        user: {
          $id: 'user-janouma',
          username: 'zanou@mail.com'
        },
        forbiddennames: [
          'pending',
          'comics followup',
          'fuzzy search'
        ]
      }
    })])
  }

  {
    let fulfillSentConfigData
    const sentConfigData = new Promise(resolve => { fulfillSentConfigData = resolve })

    await page.route(
      '/api/set-config/dashboard',

      route => {
        fulfillSentConfigData(route.request().postDataJSON())

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

    const dateNow = Date.now()
    const performanceNow = performance.now()

    await page.evaluate((timestamps) => {
      Object.assign(globalThis, {
        Date: class MockDate extends Date {
          static now () { return timestamps.dateNow }
        },

        performance: Object.create(
          performance,
          { now: { value: () => timestamps.performanceNow } }
        )
      })

      window.mockModal.mount()

      window.mockModal.element.dispatchEvent(new window.CustomEvent('pin', {
        detail: {
          title: 'starfields wksp',
          search: { workspace: 'starfields' }
        }
      }))
    }, { dateNow, performanceNow })

    await expect(sentConfigData).resolves.toEqual({
      pined: [
        {
          id: 'pending-7656877-709089808',
          title: 'pending',
          search: {
            workspace: 'pending'
          }
        },
        {
          id: 'comics-followup-09P809998-4656',
          title: 'comics followup',
          search: {
            workspace: 'comics followup'
          }
        },
        {
          id: 'fuzzy-search-12345678-0987654',
          title: 'fuzzy search',
          search: {
            workspace: 'fuzzy search'
          }
        },
        {
          id: 'starfields-wksp-' +
            (String(dateNow) + performanceNow).replaceAll('.', '-'),

          title: 'starfields wksp',
          search: {
            workspace: 'starfields'
          }
        }
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

  let fulfillSentConfigData
  const sentConfigData = new Promise(resolve => { fulfillSentConfigData = resolve })

  await page.route(
    '/api/set-config/dashboard',

    route => {
      fulfillSentConfigData(route.request().postDataJSON())

      route.fulfill({
        contentType: 'text/plain',
        body: 'config successfully set'
      })
    },

    { times: 1 }
  )

  await widget.getByTitle('Unpin search').click()
  await widget.getByTitle('Confirm search unpin').click()

  return expect(sentConfigData).resolves.toEqual({
    pined: [
      {
        id: 'comics-followup-09P809998-4656',
        title: 'comics followup',
        search: {
          workspace: 'comics followup'
        }
      },
      {
        id: 'fuzzy-search-12345678-0987654',
        title: 'fuzzy search',
        search: {
          workspace: 'fuzzy search'
        }
      }
    ]
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
    page.waitForResponse(createCountListener('/api/find-items', 3)),
    page.waitForResponse('/api/get-config/dashboard')
  ])

  await page.goto(getComponentUrl())
  await initialLoad

  await page.route(
    '/api/find-items',
    route => route.fulfill({ json: lastItems.slice(0, 3) })
  )

  const itemsUpdate = page.waitForResponse(createCountListener('/api/find-items', 3))

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
      json: {
        pined: [
          {
            id: '09P809998.4656',
            title: 'comics followup',
            search: {
              workspace: 'comics followup'
            }
          },
          {
            id: '12345678.0987654',
            title: 'fuzzy search',
            search: {
              workspace: 'fuzzy search'
            }
          }
        ],

        version: 1
      }
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
    page.waitForResponse(createCountListener('/api/find-items', 3)),
    page.waitForResponse('/api/get-config/dashboard')
  ])

  await page.goto(getComponentUrl())
  await initialLoad

  await page.route(
    '/api/get-config/dashboard',

    route => route.fulfill({
      json: {
        pined: [
          'comics followup',
          'fuzzy search'
        ].map(name => ({
          id: name + '-id',
          title: name,
          search: { workspace: name }
        })),

        version: 1
      }
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
        ].map(name => ({
          id: name + '-id',
          title: name,
          search: { workspace: name }
        })),

        version: 1
      }
    })
  )

  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('max-widget-reached'))
})

test('dashboard config update', async ({ page, lastItems }) => {
  await Promise.all([
    page.route('/api/find-items', route => route.fulfill({ json: lastItems })),

    page.route(
      '/api/get-config/dashboard',
      route => route.fulfill({ json: { pined: ['books followup', 'house survey'] } })
    ),

    page.route('/api/set-config/dashboard', route => route.fulfill({ json: {} }))
  ])

  const initialLoad = Promise.all([
    page.waitForResponse('/api/get-config/dashboard'),
    page.waitForResponse(createCountListener('/api/find-items', 2))
  ])

  await page.goto(getComponentUrl())
  await initialLoad

  return expect(page).toHaveScreenshot(getScreenshotPath('updated-config'))
})
