import { test } from '@japa/runner'
import * as td from 'testdouble'
import * as itemsApi from '../../../.lib/items.js'

const nativeFetch = fetch

const createOptionsMatcher = (expect, options) => actual => {
  try {
    expect(actual).toEqual(options)
    return true
  } catch {
    return false
  }
}

test.group('items api', group => {
  group.each.setup(() => {
    globalThis.fetch = td.function('fetch')
  })

  group.each.teardown(() => {
    globalThis.fetch = nativeFetch
    td.reset()
  })

  test('#findItems', async ({ expect }) => {
    const search = { text: 'dune "to watch"', tags: ['movie'] }
    const items = [{ $id: 'items/1', title: 'Dune' }]
    const abortController = new AbortController()

    const matchOptions = createOptionsMatcher(expect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(search),
      signal: abortController.signal
    })

    td.when(fetch('/api/find-items', td.matchers.argThat(matchOptions)))
      .thenResolve({ ok: true, json: () => Promise.resolve(items) })

    expect(await itemsApi.findItems(search, abortController)).toEqual(items)
  })

  test('#findItems failure', async ({ expect }) => {
    const search = { text: 'dune' }

    td.when(fetch('/api/find-items', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsApi.findItems(search))
      .rejects.toThrow('cannot find items for these criteria ' + JSON.stringify(search))
  })

  test('#findItems redirected response', async ({ expect }) => {
    const items = [{ $id: 'items/1', title: 'Dune' }]

    td.when(fetch('/api/find-items', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: true, json: () => Promise.resolve(items) })

    expect(await itemsApi.findItems({ text: 'dune' })).toEqual(items)
  })

  test('#countItems', async ({ expect }) => {
    const search = { text: 'dune "to watch"', tags: ['movie'] }
    const abortController = new AbortController()

    const matchOptions = createOptionsMatcher(expect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(search),
      signal: abortController.signal
    })

    td.when(fetch('/api/count-items', td.matchers.argThat(matchOptions)))
      .thenResolve({ ok: true, json: () => Promise.resolve(5) })

    expect(await itemsApi.countItems(search, abortController)).toBe(5)
  })

  test('#countItems failure', async ({ expect }) => {
    const search = { text: 'dune' }

    td.when(fetch('/api/count-items', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsApi.countItems(search))
      .rejects.toThrow('cannot count items for these criteria ' + JSON.stringify(search))
  })

  test('#countItems redirected response', async ({ expect }) => {
    td.when(fetch('/api/count-items', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: true, json: () => Promise.resolve(5) })

    expect(await itemsApi.countItems({ text: 'dune' })).toBe(5)
  })

  test('#lookup', async ({ expect }) => {
    const ids = ['items/1', 'items/2']
    const items = [{ $id: 'items/1' }, { $id: 'items/2' }]
    const abortController = new AbortController()

    const matchOptions = createOptionsMatcher(expect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids),
      signal: abortController.signal
    })

    td.when(fetch('/api/lookup-items', td.matchers.argThat(matchOptions)))
      .thenResolve({ ok: true, json: () => Promise.resolve(items) })

    expect(await itemsApi.lookup({ ids, abortController })).toEqual(items)
  })

  test('#lookup failure', async ({ expect }) => {
    const ids = ['items/1', 'items/2']

    td.when(fetch('/api/lookup-items', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsApi.lookup({ ids }))
      .rejects.toThrow('cannot find items with ids ' + ids)
  })

  test('#lookup redirected response', async ({ expect }) => {
    const items = [{ $id: 'items/1' }]

    td.when(fetch('/api/lookup-items', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: true, json: () => Promise.resolve(items) })

    expect(await itemsApi.lookup({ ids: ['items/1'] })).toEqual(items)
  })

  test('#save', async ({ expect }) => {
    const item = { title: 'Dune', type: 'url', tags: ['to watch', 'movie'] }
    const savedItem = { $id: 'items/1', ...item }

    const matchOptions = createOptionsMatcher(expect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })

    td.when(fetch('/api/save-item', td.matchers.argThat(matchOptions)))
      .thenResolve({ ok: true, json: () => Promise.resolve(savedItem) })

    expect(await itemsApi.save(item)).toEqual(savedItem)
  })

  test('#save failure', async ({ expect }) => {
    const item = { title: 'Dune' }

    td.when(fetch('/api/save-item', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsApi.save(item))
      .rejects.toThrow('cannot save item ' + JSON.stringify(item))
  })

  test('#save redirected response', async ({ expect }) => {
    const savedItem = { $id: 'items/1', title: 'Dune' }

    td.when(fetch('/api/save-item', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: true, json: () => Promise.resolve(savedItem) })

    expect(await itemsApi.save({ title: 'Dune' })).toEqual(savedItem)
  })

  test('#remove', async ({ expect }) => {
    const matchOptions = createOptionsMatcher(expect, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })

    td.when(fetch('/api/remove-item/items%2F42', td.matchers.argThat(matchOptions)))
      .thenResolve({ ok: true })

    return itemsApi.remove('items/42')
  })

  test('#remove failure', async ({ expect }) => {
    td.when(fetch('/api/remove-item/items%2F42', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsApi.remove('items/42'))
      .rejects.toThrow('cannot remove item items/42')
  })

  test('#remove redirected response', async ({ expect }) => {
    td.when(fetch('/api/remove-item/items%2F42', td.matchers.anything()))
      .thenResolve({ ok: false, redirected: true })

    return itemsApi.remove('items/42')
  })
})
