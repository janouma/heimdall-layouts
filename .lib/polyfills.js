if (document.startViewTransition && !HTMLElement.prototype.startViewTransition) {
  HTMLElement.prototype.startViewTransition = (...args) => document.startViewTransition(...args)
}
