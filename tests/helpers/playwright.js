import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  failOnJSError: [true, { option: true }],

  async page ({ page, failOnJSError }, use) {
    if (failOnJSError) {
      const errors = []

      page.addListener('pageerror', (error) => {
        errors.push(error)
      })

      await use(page)

      expect(errors).toHaveLength(0)
    }
  }
})

export { expect }
