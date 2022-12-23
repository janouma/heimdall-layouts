const head = fetch('/template/head.html')
  .then(response => response.text())
  
const body = fetch('/template/body.html')
  .then(response => response.text())

export default async function renderLayout (layout) {
  document.documentElement.classList.add('development')
  document.head.innerHTML = await head
  document.body.innerHTML = await body
  
  await import(`/layouts/${layout}/index.js`)
  
  const layoutComponent = document.createElement('hdl-' + layout)
  layoutComponent.classList.add('absolute')
  document.querySelector('hdl-layout-placeholder').replaceWith(layoutComponent)
  
  const layoutHeaderComponentTag = `hdl-${layout}-header`
  
  if (customElements.get(layoutHeaderComponentTag)) {
    const layoutHeaderComponent = document.createElement(layoutHeaderComponentTag)
    layoutHeaderComponent.classList.add('hdl-main-header-custom', 'border-box')
    document.querySelector('hdl-layout-header-placeholder').replaceWith(layoutHeaderComponent)
  }
}
