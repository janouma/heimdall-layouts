import { test, expect, getPaddedBoundingBox } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'watch'

const {
  getComponentUrl,
  getScreenshotPath
} = getComponentHelpers({ layout, main: true })

test('default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  await expect(page).toHaveScreenshot(getScreenshotPath('default'))

  const folderBrowser = page.locator('folder-browser')
  await folderBrowser.click()

  return expect(page).toHaveScreenshot(
    getScreenshotPath('playlists'),
    { clip: await getPaddedBoundingBox(folderBrowser.locator(':scope > .menu'), 50) }
  )
})

test('search', async ({ page }) => {
  await page.goto(getComponentUrl())

  const searchInput = page.getByRole('textbox', { name: '|' })
  await searchInput.fill('under')
  await page.locator('hdl-watch-movie-grid.searching').waitFor()
  return expect(page).toHaveScreenshot(getScreenshotPath('search'))
})
