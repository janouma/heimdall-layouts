import { test as base, expect } from '@playwright/test'

const isErrorAllowed = (error, exceptions) => exceptions.some(exception => {
  if (exception instanceof RegExp) { return exception.test(error.message) }

  if (exception instanceof Error) {
    return error.name === exception.name && error.message === exception.message
  }

  if (typeof exception === 'function') { return exception(error) }

  return false
})

export const test = base.extend({
  failOnJSError: [true, { option: true }],
  allowedJSErrors: [[], { option: true }],

  async page ({ page, failOnJSError, allowedJSErrors }, use) {
    if (failOnJSError) {
      const errors = []

      page.addListener('pageerror', (error) => {
        errors.push(error)
      })

      await use(page)

      const unexpectedErrors = errors.filter(
        error => !isErrorAllowed(error, allowedJSErrors)
      )

      expect(unexpectedErrors).toHaveLength(0)
    }
  }
})

export async function getClip ({ locators, expanse = 0 }) {
  const boxes = (await Promise.all(locators.map(locator => getPaddedBoundingBox(locator, expanse))))
    .filter(box => Boolean(box))

  const x = Math.min(...boxes.map(box => box.x))
  const y = Math.min(...boxes.map(box => box.y))
  const right = Math.max(...boxes.map(({ x, width }) => x + width))
  const bottom = Math.max(...boxes.map(({ y, height }) => y + height))
  const width = right - x
  const height = bottom - y

  return { x, y, width, height }
}

export async function getPaddedBoundingBox (locator, expanse) {
  return addPaddingToBox(await locator.boundingBox(), expanse)
}

export function addPaddingToBox ({ x, y, width, height }, expanse = 3) {
  return {
    x: Math.max(x - expanse, 0),
    y: Math.max(y - expanse, 0),
    width: width + 2 * expanse,
    height: height + 2 * expanse
  }
}

export { expect }
