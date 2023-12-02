import { test } from '@japa/runner'
import * as td from 'testdouble'
import { getConfig } from '../../../lib/config.js'

test.group('#getConfig', group => {
  const nativeFetch = fetch

  const configV1 = {
    pined: [{
      title: 'comics followup',
      search: {
        workspace: 'comics followup',
        includeDraft: true
      }
    }],

    version: 1
  }

  group.each.teardown(() => { globalThis.fetch = nativeFetch })

  test('up to date config retrieval', async ({ expect }) => {
    globalThis.fetch = td.function('fetch')

    td.when(fetch('/api/get-config/dashboard'))
      .thenResolve({
        ok: true,
        json: () => Promise.resolve(configV1)
      })

    {
      const config = await getConfig({ layout: 'dashboard' })
      expect(config).toEqual(configV1)
    }

    {
      const updateFrom0To1 = td.function('updateFrom0To1')

      const config = await getConfig({
        layout: 'dashboard',
        updates: [updateFrom0To1]
      })

      expect(config).toEqual(configV1)
      expect(td.explain(updateFrom0To1).callCount).toBe(0)
    }
  })

  test('obsolete config retrieval', async ({ expect }) => {
    const obsoleteConfig = { pined: ['comics followup'] }
    globalThis.fetch = td.function('fetch')

    td.when(fetch('/api/get-config/dashboard'))
      .thenResolve({
        ok: true,
        json: () => Promise.resolve(obsoleteConfig)
      })

    const configV2 = {
      pined: [{
        id: 'comics-followup',
        title: 'comics followup',

        search: {
          workspace: 'comics followup',
          includeDraft: true
        }
      }],

      version: 2
    }

    const upToDateConfigPayload = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configV2)
    }

    td.when(fetch('/api/set-config/dashboard', td.matchers.contains(upToDateConfigPayload)))
      .thenResolve()

    td.when(
      fetch(
        '/api/set-config/dashboard',
        td.matchers.not(upToDateConfigPayload)
      )
    )
      .thenDo((url, options) => {
        console.debug('unexpected fetch options:\n', JSON.stringify(options, undefined, 2))
        throw new Error('Unexpected fetch options')
      })

    const updateFrom0To1 = td.function('updateFrom0To1')
    td.when(updateFrom0To1(obsoleteConfig)).thenReturn(configV1)

    const updateFrom1To2 = td.function('updateFrom1To2')
    td.when(updateFrom1To2(configV1)).thenReturn(configV2)

    const config = await getConfig({
      layout: 'dashboard',
      updates: [updateFrom0To1, updateFrom1To2]
    })

    expect(config).toEqual(configV2)

    td.verify(
      fetch('/api/set-config/dashboard'),
      { times: 1, ignoreExtraArgs: true }
    )
  })
})
