import { test } from '@japa/runner'
import updates from '../../../../../src/dashboard/lib/config_updates.js'

const dateNow = Date.now()
const performanceNow = performance.now()

const initialConfig = {
  lastModified: 1676724248290,
  userid: 'users/4677',
  scope: 'dashboard',
  pined: ['pending', 'tech survey']
}

const upToDateConfig = {
  lastModified: 1676724248290,
  userid: 'users/4677',
  scope: 'dashboard',

  pined: [
    {
      id: `pending-${(String(dateNow) + performanceNow).replaceAll('.', '-')}`,
      title: 'pending',
      search: {
        workspace: 'pending',
        includeDraft: true
      }
    },

    {
      id: `tech-survey-${(String(dateNow) + performanceNow).replaceAll('.', '-')}`,
      title: 'tech survey',
      search: {
        workspace: 'tech survey',
        includeDraft: true
      }
    }
  ]
}

const NativeDate = Date
const nativePerformance = performance

test('successfull update with existing pined', ({ expect }) => {
  let config = structuredClone(initialConfig)

  for (let version = 0; version < updates?.length; version++) {
    config = updates[version](config)
  }

  expect(config).toEqual(upToDateConfig)
})
  .setup(() => {
    Object.assign(globalThis, {
      Date: class MockDate extends Date {
        static now () { return dateNow }
      },

      performance: Object.create(performance, { now: { value: () => performanceNow } })
    })
  })
  .teardown(() => {
    Object.assign(globalThis, {
      Date: NativeDate,
      performance: nativePerformance
    })
  })

test('successfull update without pined', ({ expect }) => {
  const source = structuredClone(initialConfig)
  delete source.pined

  let config = source

  for (let version = 0; version < updates?.length; version++) {
    config = updates[version](config)
  }

  expect(config).toEqual(source)
})
