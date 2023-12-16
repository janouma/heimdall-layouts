import { test, expect } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = '${__LAYOUT_FOLDER__}'
const component = '${__COMPONENT_FOLDER__}'

const {
  getComponentUrl,
  getScreenshotPath
} = getComponentHelpers({ layout, component })

test('${__COMPONENT_FOLDER__} default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  return expect(page).toHaveScreenshot(getScreenshotPath('default'))
})
