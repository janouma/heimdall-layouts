import { devices } from '@playwright/test'
import { existsSync } from 'fs'

const chromeBinPathes = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
]

const screenshotConfig = { maxDiffPixelRatio: 0.0125 }

export default {
  testDir: 'tests',

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
  reporter: [['html', { open: 'never' }]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  snapshotDir: 'test-snapshots/local',
  testMatch: '**/*.test.ui.js',
  retries: parseInt(process.env.PLAYWRIGHT_RETRY, 10) ?? 0,

  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,

    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://localhost:' + process.env.testPort,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      expect: { toHaveScreenshot: { ...screenshotConfig, scale: 'device' } },

      use: {
        ...(
          chromeBinPathes.some(existsSync)
            ? { channel: 'chrome' }
            : { ...devices['Desktop Chrome'] }
        ),

        deviceScaleFactor: 1.5
      }
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox']
      }
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari']
      }
    }
  ]

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
}
