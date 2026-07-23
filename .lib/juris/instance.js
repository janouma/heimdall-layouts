import '../../packages/juris/juris.mini.js'
import '../../packages/juris/juris-headless.js'
import logger from '../../packages/@byfrost/utils/logger.js'
import { clone } from '../../packages/@byfrost/utils/object.js'
import { isDevelopment } from './--/environment.js'
import { createValidator } from './--/validation.js'
import webComponentFactory from './webcomponent_factory.js'
import { flattenObject } from './utils.js'

const log = logger.getLogger('lib/juris/instance')
const validators = isDevelopment ? {} : undefined

const jurisInstance = new window.Juris({
  services: {
    setStateDeep ({ prefix, key, value }) {
      if (typeof key === 'object') {
        const flattenState = flattenObject(prefix ? { [prefix]: key } : key)

        jurisInstance.executeBatch(() => {
          for (const [path, value] of flattenState) { jurisInstance.setState(path, value) }
        })
      } else {
        jurisInstance.setState(prefix ? `${prefix}.${key}` : key, value)
      }
    },

    createMessageGetter (messagesSource) {
      if (typeof messagesSource === 'function') {
        return key => messagesSource('messages.' + key, 'messages.' + key)
      }

      if (typeof messagesSource === 'object') {
        return key => key.split('.')
          .reduce((messages, keySegment) => messages?.[keySegment], messagesSource) || 'messages.' + key
      }

      log.warn('wrong messages source type: ' + typeof messagesSource)

      return key => '[missing messages].' + key
    },

    createValidator ({ name, subscribe, getState }) {
      if (isDevelopment) {
        validators[name] ??= createValidator(name)
        const validate = validators[name]

        return function validator (key, schema) {
          const isValid = value => validate(value, key, schema)
          isValid(getState(key))
          return subscribe(key, isValid)
        }
      }

      return () => () => {}
    }
  },

  features: {
    webComponentFactory,
    headless: window.HeadlessManager
  }
})

// Patching juris

const { domRenderer, stateManager } = jurisInstance

// Patching memory leak issue

const originalCreateReactiveUpdate = domRenderer._createReactiveUpdate.bind(domRenderer)
const originalSubscribeInternal = stateManager.subscribeInternal.bind(stateManager)

const callbackUnsubscribers = new WeakMap()

stateManager.subscribeInternal = function (path, callback) {
  const unsub = originalSubscribeInternal(path, callback)

  if (callbackUnsubscribers.has(callback)) {
    callbackUnsubscribers.get(callback).add(unsub)
  }

  return unsub
}

domRenderer._createReactiveUpdate = function (element, updateFn, subscriptions) {
  const trackedUnsubs = new Set()
  let hasBeenConnected = false

  function wrappedUpdateFn (...args) {
    if (hasBeenConnected && !element.isConnected) {
      for (const unsub of trackedUnsubs) {
        try { unsub() } catch (e) {}
      }

      trackedUnsubs.clear()
      callbackUnsubscribers.delete(wrappedUpdateFn)
      return
    }

    if (!hasBeenConnected && element.isConnected) {
      hasBeenConnected = true
    }

    updateFn(...args)
  }

  callbackUnsubscribers.set(wrappedUpdateFn, trackedUnsubs)
  originalCreateReactiveUpdate(element, wrappedUpdateFn, subscriptions)
}

// Patching concurrent state update issue

const originalSetState = stateManager.setState.bind(stateManager)
const pending = []
let flushing = false
const MAX_FLUSH = 1000

stateManager.setState = function (path, value, context) {
  log.trace('setState attempt:', { path, value, context, pending: pending.length })

  if (stateManager.isUpdating || flushing) {
    pending.push([path, value, context])
    return
  }

  log.trace('setState effectively:', { path, value, context, pending: pending.length })

  originalSetState(path, value, context)

  flushing = true
  let cycles = 0

  try {
    while (pending.length > 0) {
      if (++cycles > MAX_FLUSH) {
        log.error(
          'Aborting setState flush: too many nested cycles (possible cyclic dependency).\npending state updates:',
          clone(pending)
        )

        pending.length = 0
        break
      }

      const batch = [...pending]

      jurisInstance.executeBatch(() => {
        for (const stateCallArgs of batch) { originalSetState(...stateCallArgs) }
      })

      if (batch.length === pending.length) { pending.length = 0 }
    }
  } finally {
    flushing = false
  }
}

export default jurisInstance
