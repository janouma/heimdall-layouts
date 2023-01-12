import { test, expect } from '@playwright/test'
import { getComponentHelpers } from '../../../helpers/components.js'

const layout = 'dashboard'
const component = 'workspace_finder'

const {
  getComponentUrl,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

test('regular', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      workspaces: [
        'tech survey',
        'pending',
        'escape',
        'fuzzy search',
        'books followup'
      ]
    }
  }))

  await expect(page).toHaveScreenshot(getScreenshotPath('regular'))

  const workspaceFinder = page.locator('css=' + tag)

  const pinedWorkspace = workspaceFinder.evaluate(
    element => new Promise(
      resolve =>
        element.addEventListener(
          'pin',
          ({ detail: workspace }) => resolve(workspace)
        )
    )
  )

  const selectedWorkspace = 'fuzzy search'

  await page.getByRole('listitem')
    .filter({ hasText: selectedWorkspace })
    .click()

  return expect(pinedWorkspace).resolves.toBe(selectedWorkspace)
})

test('scrolled', async ({ page }) => {
  await page.goto(getComponentUrl({
    params: {
      workspaces: Array.from(
        { length: 50 },
        (value, index) => 'workspace-' + index
      )
    }
  }))

  await page.locator('css=' + tag).evaluate(element => element.scrollBy(0, 300))
  return expect(page).toHaveScreenshot(getScreenshotPath('scrolled'))
})
