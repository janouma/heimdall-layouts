export function getActionTag (item) {
  return isLink(item) ? 'a' : 'button'
}

export function isLink (item) {
  return !item.type || item.type === 'url'
}

export function dispatchContentDisplayEvent ({ node, item }) {
  node?.parentNode.host.dispatchEvent(new window.CustomEvent(
    'show-item-content',

    {
      detail: item,
      bubbles: false
    }
  ))
}
