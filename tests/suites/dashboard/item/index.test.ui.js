import { test, expect } from '@playwright/test'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'dashboard'
const component = 'item'

const {
  getComponentUrl,
  getComponentAssetPath,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

test('item having title and icon', async ({ page }) => {
  const title = 'writesonic – best ai writer, copywritting and graphics creator'
  const iconalt = 'favicon for item'

  const params = {
    title,
    iconalt
  }

  await page.goto(getComponentUrl({
    params: {
      ...params,
      icon: getComponentAssetPath('images/writesonic_icon.png')
    }
  }))

  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('with-all-params', 'with-icon'))
  await expect(page.getByRole('img')).toHaveAttribute('alt', `${iconalt} "${title}"`)

  await page.goto(getComponentUrl({ params }))
  return expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('with-all-params', 'without-icon'))
})

test('item having short title', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      title: 'writesonic – best ai writer',
      icon: getComponentAssetPath('images/redmi_icon.ico'),
      iconalt: undefined
    }
  }))

  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('with-short-title', 'with-icon'))

  await page.goto(getComponentUrl({ params: { title: 'writesonic – best ai writer' } }))
  return expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('with-short-title', 'without-icon'))
})

test('item as placeholder', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      title: ' '.repeat(40),
      icon: undefined
    }
  }))

  return expect(page.locator('css=' + tag)).toHaveScreenshot(getScreenshotPath('placeholder'))
})

test('alt text on firefox', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox', 'n/a')

  await page.goto(getComponentUrl({
    params: {
      title: 'writesonic – best ai writer, copywritting and graphics creator',
      icon: 'unresolved/path/to/icon'
    }
  }))

  return expect(page.locator('css=' + tag)).toHaveScreenshot(getScreenshotPath('unresolved-icon-path'))
})
