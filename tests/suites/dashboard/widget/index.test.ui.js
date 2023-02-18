import { test, expect } from '@playwright/test'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'dashboard'
const component = 'widget'

const {
  getComponentUrl,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

test('overflowed widget', async ({ page, context }) => {
  await page.goto(getComponentUrl())
  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('overflowed', 'default'))

  const list = await page.getByRole('list')
  await list.hover()

  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('overflowed', 'hovered'))

  await list.evaluate(element => element.scrollBy(0, 5))
  await expect(list.getByRole('listitem').last()).toBeVisible()
  await expect(list).toHaveScreenshot(getScreenshotPath('overflowed', 'scrolled'))

  const shownItem = page.locator('css=' + tag).evaluate(
    element => new Promise(
      resolve =>
        element.addEventListener(
          'show-item-content',
          ({ detail: item }) => resolve(item)
        )
    )
  )

  await list.getByRole('listitem')
    .filter({ hasText: 'detect firefox in CSS' })
    .click()

  await expect(shownItem).resolves.toEqual({
    $id: 'detect-firefox-css-id',
    title: 'detect firefox in CSS',
    type: 'css'
  })

  const tabLoad = context.waitForEvent('page')

  await list.getByRole('listitem')
    .filter({ hasText: 'lightning CSS' })
    .click()

  const linkTab = await tabLoad
  await linkTab.waitForLoadState()

  return expect(linkTab.url()).toBe('https://lightningcss.dev/')
})

test('not overflowed widget', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { maxvisible: 8 } }))
  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('not-overflowed'))
})

test('widget without item limit', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { maxvisible: undefined } }))
  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('without-item-limit'))
})

test('widget as placeholder', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      title: ' '.repeat(20),
      items: [{ title: ' '.repeat(40) }]
    }
  }))

  return expect(page.locator('css=' + tag)).toHaveScreenshot(getScreenshotPath('placeholder'))
})

test('removable widget', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { readonly: undefined } }))

  const widget = await page.locator('css=' + tag)
  await widget.hover()

  await expect(widget).toHaveScreenshot(getScreenshotPath('removable'))

  const removeSignalReceived = page.locator('css=' + tag).evaluate(
    element => new Promise(
      resolve => element.addEventListener('remove', () => resolve(true))
    )
  )

  await page.getByTitle('Unpin workspace').click()
  return expect(removeSignalReceived).resolves.toBe(true)
})

test.describe('touchscreen', () => {
  test.use({ hasTouch: true })

  test('remove widget with touch', async ({ page }) => {
    await page.goto(getComponentUrl({ params: { readonly: undefined } }))
    const list = await page.getByRole('list')

    await list.dispatchEvent('touchstart')

    await page.evaluate(
      enlapsed => window.mockEnlapsedTime(enlapsed),
      1000
    )

    await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('touch-remove', 'long-press'))
    await list.dispatchEvent('touchend')

    await page.evaluate(
      enlapsed => window.mockEnlapsedTime(enlapsed),
      3000
    )

    await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('touch-remove', 'release'))

    await list.dispatchEvent('touchstart')

    await page.evaluate(
      enlapsed => window.mockEnlapsedTime(enlapsed),
      999
    )

    await list.dispatchEvent('touchend')

    await page.evaluate(
      enlapsed => window.mockEnlapsedTime(enlapsed),
      1
    )

    return expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('touch-remove', 'short-press'))
  })
})
