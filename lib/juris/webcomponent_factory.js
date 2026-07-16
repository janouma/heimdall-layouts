import logger from '@byfrost/utils/logger.js'
import { flattenObject } from './utils.js'

const accessorNamePattern = /^[^\d\W]\w*$/
const log = logger.getLogger('lib/juris/webcomponent_factory')

class WebComponentFactory {
  #juris

  constructor (jurisInstance) {
    this.#juris = jurisInstance
  }

  create (name, componentDefinition, options = {}) {
    log.info('Creating WebComponent', { name, hasOptions: Object.keys(options).length > 0 }, 'framework')
    return this.#createWebComponentClass(name, componentDefinition, options)
  }

  createMultiple (components, globalOptions = {}) {
    const registeredComponents = {}

    Object.entries(components).forEach(([name, definition]) => {
      const options = definition.options
        ? { ...globalOptions, ...definition.options }
        : globalOptions
      const componentFn = definition.component || definition.render || definition
      registeredComponents[name] = this.create(name, componentFn, options)
    })

    return registeredComponents
  }

  #createWebComponentClass (name, componentDefinition, options) {
    const jurisInstance = this.#juris

    const {
      attributes = [],
      accessors,
      styles = '',
      enhanceMode = false,
      autoConnect = true,
      stateNamespace = null,
      contextProvider = null
    } = options

    if (accessors?.some(accessor => typeof accessor !== 'string' || !accessor.match(accessorNamePattern))) {
      throw new Error(`some accessors don’t match the accessor pattern ${accessorNamePattern}: ${accessors}`)
    }

    return class JurisWebComponent extends HTMLElement {
      #mounted = false
      #unsubscribes = []

      static get observedAttributes () {
        return attributes
      }

      constructor () {
        super()
        this.componentName = name
        this.componentId = `${name}-${Math.random().toString(36).substring(2, 11)}`
        this.isJurisComponent = true

        if (typeof componentDefinition === 'function') {
          this.componentFn = componentDefinition
        } else if (typeof componentDefinition === 'object') {
          if ((componentDefinition.render || componentDefinition.component) && componentDefinition.setUp) {
            throw new Error('When setUp is present, render function must be defined only once by it')
          }

          const { render, component, ...componentConfig } = componentDefinition.setUp?.() || componentDefinition
          this.componentConfig = componentConfig
          this.componentFn = render || component
        }

        if (!this.componentFn) {
          throw new Error('no render function for component ' + name)
        }

        this.#setupAccessors()

        log.debug('WebComponent instance created', { name, componentId: this.componentId }, 'framework')
      }

      connectedCallback () {
        if (!autoConnect) return

        log.debug('WebComponent connecting', { name, componentId: this.componentId }, 'framework')

        this.#setupShadowDOM()
        this.#setupJurisIntegration()
        this.#setupAttributes()
        this.#rewindSetters()
        this.#setupStyles()

        if (this.componentConfig?.hooks?.onConnect) {
          this.componentConfig.hooks.onConnect.call(this, this.jurisContext)
        }

        this.render()
        this.#mounted = true

        if (this.componentConfig?.hooks?.onMount) {
          requestAnimationFrame(() => {
            this.componentConfig.hooks.onMount.call(this, this.jurisContext)
          })
        }
      }

      disconnectedCallback () {
        log.debug('WebComponent disconnecting', { name, componentId: this.componentId }, 'framework')

        this.#mounted = false

        this.#unsubscribes.forEach(unsubscribe => {
          try {
            unsubscribe()
          } catch (error) {
            log.warn('Error during subscription cleanup:', error, 'framework')
          }
        })
        this.#unsubscribes = []

        if (this.componentConfig?.hooks?.onUnmount) {
          this.componentConfig.hooks.onUnmount.call(this, this.jurisContext)
        }

        if (this.stateKey && options.cleanupState !== false) {
          jurisInstance.stateManager.setState(this.stateKey, undefined)
        }
      }

      attributeChangedCallback (name, oldValue, newValue) {
        if (oldValue !== newValue && this.#mounted) {
          log.debug('Attribute changed', { name, oldValue, newValue }, 'framework')

          if (this.stateKey) {
            const currentState = jurisInstance.getState(this.stateKey, {})
            jurisInstance.setState(this.stateKey, {
              ...currentState,
              [name]: this.#parseAttributeValue(newValue)
            })
          }

          if (this.componentConfig?.hooks?.onAttributeChange) {
            this.componentConfig.hooks.onAttributeChange.call(this, name, oldValue, newValue, this.jurisContext)
          }

          if (options.rerenderOnAttributeChange !== false) {
            this.render()
          }
        }
      }

      #setupShadowDOM () {
        if (!enhanceMode) {
          this.attachShadow({ mode: 'open' })
          this.renderRoot = this.shadowRoot
        } else {
          this.renderRoot = this
        }
      }

      #setupJurisIntegration () {
        this.stateKey = stateNamespace || `webcomponents.${name.replace(/-/g, '_')}.${this.componentId}`
        const initialState = this.#getInitialState()
        jurisInstance.setState(this.stateKey, initialState)

        this.jurisContext = this.#createJurisContext()

        const unsubscribe = jurisInstance.subscribe(this.stateKey, () => {
          if (this.#mounted && options.autoRerender !== false) {
            log.debug('Auto re-rendering due to state change', { componentId: this.componentId }, 'framework')
            this.render()
          }

          if (this.componentConfig?.hooks?.onUpdate) {
            requestAnimationFrame(() => this.componentConfig.hooks.onUpdate.call(this, this.jurisContext))
          }
        })

        this.#unsubscribes.push(unsubscribe)
      }

      #createJurisContext () {
        const baseContext = contextProvider
          ? contextProvider.call(this, jurisInstance.createContext(this))
          : jurisInstance.createContext(this)

        return {
          ...baseContext,
          component: {
            name: this.componentName,
            id: this.componentId,
            element: this,
            renderRoot: this.renderRoot,
            shadowRoot: this.shadowRoot,

            getState: (key, defaultValue) => {
              const fullKey = key ? `${this.stateKey}.${key}` : this.stateKey
              return jurisInstance.getState(fullKey, defaultValue)
            },

            setState: (key, value) => {
              if (typeof key === 'object') {
                const flattenState = flattenObject(key)

                jurisInstance.executeBatch(() => {
                  for (const [path, value] of flattenState) {
                    jurisInstance.setState(`${this.stateKey}.${path}`, value)
                  }
                })
              } else {
                const fullKey = key ? `${this.stateKey}.${key}` : this.stateKey
                jurisInstance.setState(fullKey, value)
              }
            },

            updateState: (updates) => {
              const currentState = jurisInstance.getState(this.stateKey, {})
              jurisInstance.setState(this.stateKey, { ...currentState, ...updates })
            },

            getAttribute: (name, defaultValue = null) => {
              return this.getAttribute(name) || defaultValue
            },

            setAttribute: (name, value) => {
              this.setAttribute(name, value)
            },

            emit: (eventName, detail = {}, options = {}) => {
              const event = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                composed: true,
                ...options
              })
              this.dispatchEvent(event)
              return event
            },

            getSlot: (name = '') => {
              return name
                ? this.querySelector(`[slot="${name}"]`)
                : this.querySelector(':not([slot])')
            },

            getAllSlots: () => {
              const slots = {}
              this.querySelectorAll('[slot]').forEach(el => {
                const slotName = el.getAttribute('slot')
                if (!slots[slotName]) slots[slotName] = []
                slots[slotName].push(el)
              })
              return slots
            },

            subscribe: (key, listener) => {
              if (typeof key !== 'string' || !key?.trim()) {
                throw new Error('Wrong state key: ' + JSON.stringify(key))
              }

              return jurisInstance.subscribe(`${this.stateKey}.${key}`, listener)
            }
          }
        }
      }

      #getInitialState () {
        let initialState = {}

        if (this.componentConfig?.initialState) {
          if (typeof this.componentConfig.initialState === 'function') {
            initialState = this.componentConfig.initialState.call(this)
          } else {
            initialState = { ...this.componentConfig.initialState }
          }
        }

        if (this.componentFn?.getInitialState) {
          initialState = { ...initialState, ...this.componentFn.getInitialState.call(this) }
        }

        attributes.forEach(attr => {
          if (this.hasAttribute(attr)) {
            initialState[attr] = this.#parseAttributeValue(this.getAttribute(attr))
          }
        })

        return initialState
      }

      #setupAccessors () {
        if (accessors?.length > 0) {
          const conflictingAccessors = accessors.filter(accessor => accessor in this)

          if (conflictingAccessors.length === 0) {
            for (const accessor of accessors) {
              const privateMemberName = accessor + String(performance.now()).replace('.', '_')

              Reflect.defineProperty(this, accessor, {
                get () {
                  return this['#' + privateMemberName]
                },

                set (value) {
                  this['#' + privateMemberName] = value
                  this.getJurisContext()?.component.setState(accessor, value)
                }
              })
            }
          } else {
            throw new Error('the following accessors are forbidden: ' + conflictingAccessors)
          }
        }
      }

      #rewindSetters () {
        if (accessors?.length > 0) {
          const componentContext = this.getJurisContext()?.component

          if (componentContext) {
            const { getState, setState } = componentContext
            let areAllUpToDate = true

            jurisInstance.executeBatch(() => {
              for (const accessor of accessors) {
                if (getState(accessor) !== this[accessor]) {
                  setState(accessor, this[accessor])
                  areAllUpToDate = false
                }
              }
            })

            if (areAllUpToDate) {
              log.debug('all setters are up to date')
            }
          }
        }
      }

      #setupAttributes () {
        attributes.forEach(attr => {
          if (this.hasAttribute(attr)) {
            const value = this.#parseAttributeValue(this.getAttribute(attr))
            this.jurisContext.component.setState(attr, value)
          }
        })
      }

      #setupStyles () {
        if (styles && this.shadowRoot) {
          const styleElement = document.createElement('style')
          styleElement.textContent = styles
          this.shadowRoot.appendChild(styleElement)
        }
      }

      #parseAttributeValue (value) {
        if (value === null || value === undefined) return value
        if (value === 'true') return true
        if (value === 'false') return false
        if (value === '') return true // Boolean attribute
        if (!isNaN(value) && !isNaN(parseFloat(value))) return parseFloat(value)
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }

      render () {
        try {
          log.debug('Rendering WebComponent', { componentId: this.componentId }, 'framework')

          let vdom
          if (this.componentFn) {
            vdom = this.componentFn(this.#getProps(), this.jurisContext)
          } else if (this.componentConfig?.template) {
            vdom = this.componentConfig.template.call(this, this.#getProps(), this.jurisContext)
          } else {
            log.warn('No render method found for WebComponent', { name }, 'framework')
            return
          }

          if (vdom instanceof Promise) {
            this.#handleAsyncRender(vdom)
            return
          }

          if (vdom) {
            const element = jurisInstance.objectToHtml(vdom)
            const children = [element]

            if (this.shadowRoot && styles) {
              const styleElement = document.createElement('style')
              styleElement.textContent = styles
              children.unshift(styleElement)
            }

            this.renderRoot.replaceChildren(...children)
          }
        } catch (error) {
          log.error('WebComponent render error', {
            name,
            componentId: this.componentId,
            error: error.message
          }, 'framework')

          this.#renderError(error)
        }
      }

      #handleAsyncRender (vdomPromise) {
        let loadingElement

        if (typeof this.componentConfig?.renderLoading === 'function') {
          const loadingVdom = this.componentConfig?.renderLoading(this.#getProps(), this.jurisContext)
          loadingElement = jurisInstance.objectToHtml(loadingVdom)
        } else {
          loadingElement = document.createElement('div')
          loadingElement.classList.add('juris-loading')
          loadingElement.textContent = 'Loading...'
        }

        this.renderRoot.replaceChildren(loadingElement)

        vdomPromise
          .then(vdom => {
            if (this.#mounted) {
              const element = jurisInstance.objectToHtml(vdom)
              this.renderRoot.replaceChildren(element)
            }
          })
          .catch(error => {
            log.error('Async render error', { error: error.message }, 'framework')
            this.#renderError(error)
          })
      }

      #renderError (error) {
        const errorElement = document.createElement('div')
        errorElement.style.cssText = 'color: red; padding: 10px; border: 1px solid red; background: #fee;'
        errorElement.textContent = `Component Error: ${error.message}`
        this.renderRoot.replaceChildren(errorElement)
      }

      #getProps () {
        const props = {}

        attributes.forEach(attr => {
          if (this.hasAttribute(attr)) {
            props[attr] = this.#parseAttributeValue(this.getAttribute(attr))
          }
        })

        const state = jurisInstance.getState(this.stateKey, {})
        Object.assign(props, state)

        return props
      }

      forceRender () {
        this.render()
      }

      getJurisContext () {
        return this.jurisContext
      }

      getComponentState () {
        return jurisInstance.getState(this.stateKey, {})
      }

      updateComponentState (updates) {
        this.jurisContext.component.updateState(updates)
      }
    }
  }
}

Object.freeze(WebComponentFactory)
Object.freeze(WebComponentFactory.prototype)

export default WebComponentFactory
