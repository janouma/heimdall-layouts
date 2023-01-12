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

test('item having title, icon and background', async ({ page }) => {
  const title = 'writesonic – best ai writer, copywritting and graphics creator'
  const iconalt = 'favicon for item'

  const params = {
    title,
    iconalt,
    snapshot: getComponentAssetPath('images/writesonic_screenshot.png')
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

test('snippet', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      title: 'detect firefox in CSS',
      type: 'css'
    }
  }))

  return expect(page.locator('css=' + tag)).toHaveScreenshot(getScreenshotPath('snippet'))
})

test('item as placeholder', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      title: ' '.repeat(40),
      icon: undefined,
      snapshot: undefined
    }
  }))

  return expect(page.locator('css=' + tag)).toHaveScreenshot(getScreenshotPath('placeholder'))
})
