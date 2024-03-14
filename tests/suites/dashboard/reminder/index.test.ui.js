import { test as testBase, expect } from '../../../helpers/playwright.js'
import { readFileSync } from 'fs'
import { getComponentHelpers } from '../../../helpers/components.js'

const test = testBase.extend({
  async lastItems ({ page: _ }, use) {
    const serializedItems = readFileSync(
      './tests/fixtures/dashboard/last_items.json'
    )
    const lastItems = JSON.parse(serializedItems)
    use(lastItems)
  }
})

const layout = 'dashboard'
const component = 'reminder'

const { getComponentUrl, getScreenshotPath, tag } = getComponentHelpers({
  layout,
  component
})

function waitForScrollThreshold (page, threshold) {
  return new Promise((resolve, reject) => {
    const TIMEOUT = 10000
    const start = Date.now()

    setTimeout(function waitForScroll () {
      page.evaluate((tagName) => {
        const carousel = document.querySelector(tagName).shadowRoot.querySelector('ul')
        return carousel.scrollLeft
      }, tag)
        .then(scrollLeft => {
          if (scrollLeft >= threshold) {
            resolve()
          } else {
            if (Date.now() - start > TIMEOUT) {
              reject(new Error('timeout reached while waiting for scroll'))
            } else {
              setTimeout(waitForScroll, 100)
            }
          }
        })
    }, 100)
  })
}

test('default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  return expect(page.locator('css=' + tag)).toHaveScreenshot(
    getScreenshotPath('default')
  )
})

test('page switch with page size of 2', async ({ page }) => {
  // TODO: fix test flackyness
  test.skip(true, 'scroll simulation doesn’t works properly')

  await page.goto(getComponentUrl())
  await page.evaluate(() => window.mockEnlapsedTimeFrame(0))
  await page.evaluate(() => window.mockEnlapsedTimeFrame(10000))
  await waitForScrollThreshold(page, 596)

  return expect(page.locator('css=' + tag)).toHaveScreenshot(
    getScreenshotPath('page-switch', 'page-size-2')
  )
})

test('manual page switch', async ({ page }) => {
  await page.goto(getComponentUrl())
  await page.evaluate(() => window.mockEnlapsedTimeFrame(0))

  const gotoPageBtn = page.getByTitle('Goto page 2')
  await gotoPageBtn.click()

  await page.evaluate(() => window.mockEnlapsedTimeFrame(10000))

  return expect(page.locator('css=' + tag)).toHaveScreenshot(
    getScreenshotPath('page-switch', 'page-size-2')
  )
})

test('scroll to page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'scrolling works properly only on chromium')

  await page.goto(getComponentUrl())

  await page.evaluate(() => {
    window.enableTimeoutsMock()
    window.mockEnlapsedTimeFrame(0)
  })

  const wheelXDelta = 350

  await page.getByRole('list').hover()
  await page.mouse.wheel(wheelXDelta, 0)
  await waitForScrollThreshold(page, 596)

  await page.evaluate(() => {
    window.mockEnlapsedTime(100)
    window.mockEnlapsedTimeFrame(10000)
  })

  await expect(page.locator('css=' + tag)).toHaveScreenshot(
    getScreenshotPath('page-scroll', 'next-page')
  )

  await page.mouse.wheel(wheelXDelta, 0)
  await waitForScrollThreshold(page, 1192)

  await page.evaluate(() => {
    window.mockEnlapsedTime(100)
    window.mockEnlapsedTimeFrame(10000)
  })

  return expect(page.locator('css=' + tag)).toHaveScreenshot(
    getScreenshotPath('page-scroll', 'same-page')
  )
})

test.describe('wide screen', () => {
  test.use({ viewport: { width: 2560, height: 1080 } })

  test('with only one item', async ({ page, lastItems }) => {
    await page.goto(
      getComponentUrl({ params: { items: lastItems.slice(1, 2) } })
    )
    return expect(page.locator('css=' + tag)).toHaveScreenshot(
      getScreenshotPath('wide-screen', 'single-item')
    )
  })

  test('with several items', async ({ page }) => {
    await page.goto(getComponentUrl())
    return expect(page.locator('css=' + tag)).toHaveScreenshot(
      getScreenshotPath('wide-screen', 'several-items')
    )
  })

  test('page switch with page size of 5', async ({ page }) => {
    // TODO: fix test flackyness
    test.skip(true, 'scroll simulation doesn’t works properly')

    await page.goto(getComponentUrl())
    await page.evaluate(() => window.mockEnlapsedTimeFrame(0))
    await page.evaluate(() => window.mockEnlapsedTimeFrame(25000))
    await waitForScrollThreshold(page, 1490)

    return expect(page.locator('css=' + tag)).toHaveScreenshot(
      getScreenshotPath('page-switch', 'page-size-5')
    )
  })
})

test.describe('touch screen', () => {
  test.use({ hasTouch: true })

  test('page switch reset on touch', async ({ page }) => {
    await page.goto(getComponentUrl())

    await page.evaluate(() => {
      window.enableTimeoutsMock()
      window.mockEnlapsedTimeFrame(0)
    })

    await page.getByRole('list').dispatchEvent('touchstart')

    await page.evaluate(
      () => {
        window.mockEnlapsedTime(100)
        window.mockEnlapsedTimeFrame(10000)
      }
    )

    return expect(page.locator('css=' + tag)).toHaveScreenshot(
      getScreenshotPath('touch')
    )
  })
})
