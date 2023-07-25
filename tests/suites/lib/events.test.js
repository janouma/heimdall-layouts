import { test } from '@japa/runner'
import * as td from 'testdouble'
import { onLongTouch } from '../../../lib/events.js'

test.group('#onLongTouch', () => {
  const nativeSetTimeout = setTimeout
  const nativeClearTimeout = clearTimeout

  test('long touch triggers after one second', ({ expect }) => {
    const timeoutId = 'timeoutId'
    const listener = td.function('listener')
    const oneSecond = 1000

    const node = {
      listeners: undefined,

      addEventListener (event, listener) {
        this.listeners ??= {}
        this.listeners[event] = listener
      }
    }

    td.when(setTimeout(td.matchers.isA(Function), td.matchers.isA(Number)))
      .thenDo((fn, delay) => {
        if (delay === oneSecond) {
          fn()
          return timeoutId
        }

        return 'unexpected timeout id'
      })

    onLongTouch(node, listener)

    node.listeners.touchstart?.()
    node.listeners.touchend?.()

    td.verify(clearTimeout(undefined))
    td.verify(listener({ target: node }))
    td.verify(clearTimeout(timeoutId))
  })
    .setup(() => {
      globalThis.setTimeout = td.function('setTimeout')
      globalThis.clearTimeout = td.function('clearTimeout')
    })
    .teardown(() => {
      globalThis.setTimeout = nativeSetTimeout
      globalThis.clearTimeout = nativeClearTimeout
    })
})
