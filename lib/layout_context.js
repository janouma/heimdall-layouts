export const state = {
  search: {
    value: {
      text: 'initial search'
    },

    subscribe (listener) {
      this.listeners ??= []
      this.listeners = Array.from(new Set([...this.listeners, listener]))
      this.set(this.value)
      return () => this.unsubscribe(listener)
    },

    unsubscribe (listener) {
      this.listeners = this.listeners?.filter(registered => registered !== listener)
    },

    set (value) {
      this.value = value
      this.listeners?.forEach(listener => listener(value))
    },

    update (mutate) {
      this.set(mutate(this.value))
    }
  }
}

export const sseClient = {
  onConnect () {},
  offConnect () {}
}
