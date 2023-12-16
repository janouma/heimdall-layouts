import { test, expect } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'dashboard'
const component = 'add_widget'

const {
  getComponentUrl,
  getScreenshotPath
} = getComponentHelpers({ layout, component })

test('add widget button', async ({ page }) => {
  await page.goto(getComponentUrl())
  await expect(page.locator('css=.wrapper')).toHaveScreenshot(getScreenshotPath('idle'))

  const button = await page.getByRole('button')
  await button.hover()

  await expect(button).toHaveCSS('background-color', 'rgba(34, 32, 56, 0.5)')
  return expect(button).toHaveAttribute('title', 'Add a widget')
})
