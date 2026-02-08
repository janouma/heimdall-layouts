import { devices } from '@playwright/test'
import env from './env.js'

const screenshotConfig = {
  maxDiffPixelRatio: 0.00625
}

const testResults = 'test-results'

export default {
  workers: '33%',
  testDir: 'tests',

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: testResults,

  /* Maximum time one test can run for. */
  timeout: 30 * 1000,

  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
    toHaveScreenshot: screenshotConfig
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [[
    '@byfrost/utils/tests/helpers/reporter.js',
    { outputFile: testResults + '/failures.json' }
  ]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  snapshotDir: 'test-snapshots/local',
  testMatch: '**/*.test.ui.js',
  retries: parseInt(process.env.PLAYWRIGHT_RETRY, 10) || 0,

  use: {
    screenshot: process.env.PLAYWRIGHT_SCREENSHOT || undefined,

    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,

    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://localhost:' + env.port,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      expect: { toHaveScreenshot: { ...screenshotConfig, scale: 'device' } },

      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1.5
      }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
}
