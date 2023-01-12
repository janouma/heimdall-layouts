export function onLongTouch (node, listener) {
  if (typeof listener === 'function') {
    const delay = 1000
    let timeoutId

    node.addEventListener('touchstart', () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => listener({ target: node }), delay)
    })

    node.addEventListener('touchend', () => clearTimeout(timeoutId))
  }
}
