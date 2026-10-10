import { test, expect } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'watch'
const hostComponent = 'body'
const component = 'hero_carousel'
const cssClass = '.hero-carousel'

const {
  getComponentUrl: getHostComponentUrl,
  getScreenshotPath: getHostScreenshotPath
} = getComponentHelpers({ layout, component: hostComponent })

const getComponentUrl = ({
  case: useCase = component,
  ...args
} = {}) => getHostComponentUrl({ case: useCase, ...args })

const getScreenshotPath = (name, ...args) =>
  getHostScreenshotPath(name, component, ...args)

test('default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  const carousel = page.locator(cssClass)

  await expect(carousel).toHaveScreenshot(getScreenshotPath('default'))

  const forwardBtn = carousel.getByRole('button', { name: 'forward' })
  const backwardBtn = carousel.getByRole('button', { name: 'back' })

  await carousel.hover()

  await expect(forwardBtn).toBeHidden()
  await expect(backwardBtn).toBeHidden()

  const medianPoster = carousel.locator('.median')
  await medianPoster.click()

  const zoomCount = await page.evaluate(() => window.testContext.zoom.length)
  expect(zoomCount).toBe(0)
})

test('fully filled', async ({ page, browserName }) => {
  await page.goto(getComponentUrl({ params: { withAllItems: true } }))

  if (browserName === 'chromium') {
    await page.evaluate(() => {
      document.startViewTransition = HTMLElement.prototype.startViewTransition =
        async fn => {
          await Promise.try(fn)
          return Promise.resolve({ finished: true })
        }
    })
  }

  const carousel = page.locator(cssClass)
  await expect(carousel).toHaveScreenshot(getScreenshotPath('filled'))

  const medianPoster = carousel.locator('.median')
  await medianPoster.hover()
  await expect(medianPoster).toHaveCSS('cursor', 'pointer')
  await expect(carousel).toHaveScreenshot(getScreenshotPath('hover-median'))

  await medianPoster.click()
  const [zoomedItem] = await page.evaluate(() => window.testContext.zoom)
  expect(zoomedItem.$id).toBe('dracula')

  const posterNextMedian = medianPoster.locator(':scope + .hero-poster')
  await posterNextMedian.click()

  const zoomCount = await page.evaluate(() => window.testContext.zoom.length)
  expect(zoomCount).toBe(1)

  const forwardBtn = carousel.getByRole('button', { name: 'forward' })
  await forwardBtn.click()

  await expect(carousel).toHaveScreenshot(getScreenshotPath('filled-forward'))

  const backwardBtn = carousel.getByRole('button', { name: 'back' })
  await backwardBtn.click()

  await expect(carousel).toHaveScreenshot(getScreenshotPath('filled'))

  for (let i = 0; i < 7; i++) {
    await forwardBtn.locator(':scope:enabled').waitFor()
    await forwardBtn.click()
  }

  await expect(carousel).toHaveScreenshot(getScreenshotPath('filled'))

  for (let i = 0; i < 7; i++) {
    await backwardBtn.locator(':scope:enabled').waitFor()
    await backwardBtn.click()
  }

  return expect(carousel).toHaveScreenshot(getScreenshotPath('filled'))
})

test('partially filled', async ({ page, browserName }) => {
  await page.goto(getComponentUrl({ params: { withSomeItems: true } }))

  if (browserName === 'chromium') {
    await page.evaluate(() => {
      document.startViewTransition = HTMLElement.prototype.startViewTransition =
        async fn => {
          await Promise.try(fn)
          return Promise.resolve({ finished: true })
        }
    })
  }

  const carousel = page.locator(cssClass)
  await expect(carousel).toHaveScreenshot(getScreenshotPath('partially-filled'))

  await carousel.hover()
  const forwardBtn = carousel.getByRole('button', { name: 'forward' })

  for (let i = 0; i < 3; i++) {
    await forwardBtn.locator(':scope:enabled').waitFor()
    await forwardBtn.click()
  }

  await expect(carousel).toHaveScreenshot(getScreenshotPath('partially-filled'))

  const backwardBtn = carousel.getByRole('button', { name: 'back' })

  for (let i = 0; i < 3; i++) {
    await backwardBtn.locator(':scope:enabled').waitFor()
    await backwardBtn.click()
  }

  return expect(carousel).toHaveScreenshot(getScreenshotPath('partially-filled'))
})

test.describe('on touch device', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true
  })

  test('swipe navigation', ({ page, browserName }) => expectSwipeNavigation({
    page,
    browserName,
    initialGolden: 'portrait-mini-screen',
    swipingGolden: 'touch-swiping',
    forwardGolden: 'touch-forward'
  }))

  test.describe('in landscape', () => {
    test.use({ viewport: { width: 667, height: 375 } })

    // several posters showing at once: the neighbours shift along the median one
    test('swipe navigation', ({ page, browserName }) => expectSwipeNavigation({
      page,
      browserName,
      initialGolden: 'landscape-mini-screen',
      swipingGolden: 'landscape-touch-swiping',
      forwardGolden: 'landscape-touch-forward'
    }))
  })

  // no view transition shim here: the switch is precisely what must not happen
  test('swipe below threshold', async ({ page }) => {
    await page.goto(getComponentUrl({ params: { withAllItems: true } }))

    const carousel = page.locator(cssClass)
    await expect(carousel).toHaveScreenshot(getScreenshotPath('portrait-mini-screen'))

    const { x, y, width, height } = await carousel.boundingBox()
    const swipeStart = { x: x + width / 2, y: y + height / 2 }

    await dispatchTouch(carousel, 'touchstart', swipeStart)
    await dispatchTouch(carousel, 'touchmove', { ...swipeStart, x: swipeStart.x - 60 })

    // the very state the granted swipe goes through
    await expect(carousel).toHaveScreenshot(getScreenshotPath('touch-swiping'))

    await dispatchTouch(carousel, 'touchend')
    await expectAnimationSettled(carousel)

    // the posters snap back in place instead of switching
    return expect(carousel).toHaveScreenshot(getScreenshotPath('portrait-mini-screen'))
  })
})

test('resize', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { withAllItems: true } }))

  page.setViewportSize({ width: 375, height: 667 })
  await expect(page.locator(cssClass)).toHaveScreenshot(getScreenshotPath('portrait-mini-screen'))

  page.setViewportSize({ width: 667, height: 375 })
  await expect(page.locator(cssClass)).toHaveScreenshot(getScreenshotPath('landscape-mini-screen'))

  page.setViewportSize({ width: 1440, height: 375 })
  return expect(page.locator(cssClass)).toHaveScreenshot(getScreenshotPath('large-landscape-mini-screen'))
})

async function expectSwipeNavigation ({
  page,
  browserName,
  initialGolden,
  swipingGolden,
  forwardGolden
}) {
  await page.goto(getComponentUrl({ params: { withAllItems: true } }))

  if (browserName === 'chromium') {
    await page.evaluate(() => {
      document.startViewTransition = HTMLElement.prototype.startViewTransition =
        async fn => {
          await Promise.try(fn)
          return Promise.resolve({ finished: true })
        }
    })
  }

  const carousel = page.locator(cssClass)

  await expect(carousel.getByRole('button', { name: 'forward' })).toBeHidden()
  await expect(carousel.getByRole('button', { name: 'back' })).toBeHidden()

  // the same rendering as the one reached by resizing down to that viewport
  await expect(carousel).toHaveScreenshot(getScreenshotPath(initialGolden))

  const { x, y, width, height } = await carousel.boundingBox()
  const swipeStart = { x: x + width / 2, y: y + height / 2 }

  await dispatchTouch(carousel, 'touchstart', swipeStart)

  // short of the 100px shift limit, the posters follow the finger as is,
  // halfway between two slots
  const moveDefaultPrevented = await dispatchTouch(
    carousel,
    'touchmove',
    { ...swipeStart, x: swipeStart.x - 60 }
  )

  expect(moveDefaultPrevented).toBe(true)
  await expect(carousel).toHaveScreenshot(getScreenshotPath(swipingGolden))

  // past the shift limit, where the swipe is damped, the switch is granted
  await dispatchTouch(carousel, 'touchmove', { ...swipeStart, x: swipeStart.x - 150 })
  await dispatchTouch(carousel, 'touchend')
  await expectAnimationSettled(carousel)

  // a leftward swipe switches the posters the way the forward button does
  await expect(carousel).toHaveScreenshot(getScreenshotPath(forwardGolden))

  await dispatchTouch(carousel, 'touchstart', swipeStart)
  await dispatchTouch(carousel, 'touchmove', { ...swipeStart, x: swipeStart.x + 150 })
  await dispatchTouch(carousel, 'touchend')
  await expectAnimationSettled(carousel)

  // the opposite swipe brings the initial posters back
  return expect(carousel).toHaveScreenshot(getScreenshotPath(initialGolden))
}

// a generic Event carrying plain touch points is used because webkit
// does not expose the Touch constructor
const dispatchTouch = (locator, type, position = { x: 0, y: 0 }) => locator.evaluate(
  (element, { type, x, y }) => {
    const event = new Event(type, { bubbles: true, composed: true, cancelable: true })
    const touch = { clientX: x, clientY: y }

    Object.assign(event, {
      touches: type === 'touchend' ? [] : [touch],
      changedTouches: [touch]
    })

    element.dispatchEvent(event)
    return event.defaultPrevented
  },

  { type, ...position }
)

// the navigation buttons are hidden on touch devices, hence unusable to tell
// the poster switch is over
const expectAnimationSettled = carousel =>
  expect(carousel.locator('.hero-poster.animated')).toHaveCount(0)
