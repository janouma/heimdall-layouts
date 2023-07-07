export const actions = {
  saveItem () {},
  removeItem () {},
  getItemContent () {},
  findItems () {},
  countItems () {},
  getTimeline () {},
  updateSearchResults () {},
  getUnconnectedNeighbors () {}
}

export const mutations = {
  setModal (...args) {
    console.debug('setModal:', ...args)
    window.dispatchEvent(new window.CustomEvent('set-modal', { detail: args }))

    window.mockModal = {
      element: undefined,

      mount () {
        this.element = document.createElement('div')
        args[0]?.onMount?.(this.element)
      }
    }
  },

  setSearchOffset () {},
  setSearchTags () {},
  setSearchConnectees () {},
  setSearchText () {},
  setSearchWorkspace () {},
  setSearchIncludeDraft () {},
  setSearch () {}
}

export const computed = {
  connected: createStore(false),
  tagAliases: createStore([]),
  cleanSearch: createStore({}),
  isSearchingWithTransition: createStore(false)
}

export const state = {
  session: createStore({
    user: {
      $id: 'user-janouma'
    }
  }),

  webSocketOpen: createStore(false),
  bookmarkletToken: createStore(),
  modal: createStore(),
  tags: createStore([]),

  workspaces: createStore([
    { name: 'tech survey' },
    { name: 'pending' },
    { name: 'escape' },
    { name: 'health survey' },
    { name: 'books followup' },
    { name: 'comics followup' },
    { name: 'house survey' },
    { name: 'heroku like' },
    { name: 'job survey' },
    { name: 'home support' },
    { name: 'synonym search' },
    { name: 'proxy services' },
    { name: 'fuzzy search' },
    { name: 'starfields' },
    { name: 'julia survey' },
    { name: 'graphic survey' },
    { name: 'game survey' },
    { name: 'devops dashboard' },
    { name: 'music discovery' },
    { name: 'droplets conf' }
  ]),

  items: createStore([]),
  itemsCount: createStore(0),

  search: createStore({
    offset: 0,
    max: 20,
    tags: [],
    connectees: [],
    text: 'initial search',
    workspace: '',
    includeDraft: false
  }),

  searching: createStore(false),
  shouldSearchTransitionSkipped: createStore(false),
  timeline: createStore(),
  connections: createStore(),
  highContrast: createStore(false),
  isHighContrastPersisted: createStore(false),
  layout: createStore('astral'),
  availableLayouts: createStore()
}

export function addGlobalEventListener () {}
export function dispatchGlobalEvent () {}
export function removeGlobalEventListener () {}

export const sseClient = {
  subscribe (path, listener) {
    console.debug('subscribed to path', path)

    window.mockSse ??= {}
    window.mockSse.subscriptions ??= {}
    window.mockSse.subscriptions[path] ??= []
    window.mockSse.subscriptions[path].push(listener)
  },

  unsubscribe (path) {
    console.debug('unsubscribe from path', path)
  },

  onConnect (listener) {
    window.mockSse ??= {}
    window.mockSse.connectListeners ??= []
    window.mockSse.connectListeners.push(listener)
  },

  offConnect () {},
  onDisconnect () {},
  offDisconnect () {}
}

export { default as log } from '../../lib/loglevel_placeholder.js'

function createStore (initialValue) {
  let value = initialValue
  let listeners

  function notifyChange () {
    listeners?.forEach(listener => listener(value))
  }

  return Object.freeze({
    get value () {
      return value
    },

    subscribe (listener) {
      listeners ??= []
      listeners = Array.from(new Set([...listeners, listener]))
      notifyChange()
      return () => this.unsubscribe(listener)
    },

    unsubscribe (listener) {
      listeners = listeners?.filter(registered => registered !== listener)
    },

    set (newValue) {
      const oldValue = value
      value = newValue

      if (newValue !== oldValue) {
        notifyChange()
      }
    },

    update (mutate) {
      this.set(mutate(value))
    }
  })
}
