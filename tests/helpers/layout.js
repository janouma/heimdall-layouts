import * as layoutContext from './layout_context.js'
import { createResolver } from '../../lib/path.js'

const resolvePath = createResolver(import.meta.url)

const head = fetch(resolvePath('../../templates/preview/head.html'))
  .then(response => response.text())

const body = fetch(resolvePath('../../templates/preview/body.html'))
  .then(response => response.text())

export default async function renderLayout (layout) {
  document.documentElement.classList.add('development')
  document.head.innerHTML = await head
  document.body.innerHTML = await body

  const styleLink = document.createElement('link')
  styleLink.setAttribute('rel', 'stylesheet')
  styleLink.setAttribute('href', resolvePath('../../templates/preview/index.css'))
  document.head.appendChild(styleLink)

  document.querySelector('.hdl-modal > .hdl-close').addEventListener(
    'click',
    ({ target: { parentNode: modal } }) => {
      modal.classList.add('not-visible')
      document.querySelector('main').classList.remove('blur')
    }
  )

  window.addEventListener('set-modal', ({ detail: args }) => {
    const modal = document.querySelector('.hdl-modal')
    const main = document.querySelector('main')

    if (args.length > 0) {
      const [{ component: componentTag, onMount, params }] = args
      const placeholder = document.querySelector('.hdl-modal > .hdl-content')

      const component = document.createElement(componentTag)
      component.classList.add('hdl-content')

      Object.assign(component, params)

      modal.replaceChild(component, placeholder)
      onMount?.(component)

      main.classList.add('blur')
      modal.classList.remove('not-visible')
    } else {
      modal.addEventListener(
        'transitionend',

        () => {
          const placeholder = document.createElement('div')
          placeholder.classList.add('hdl-content')

          const component = document.querySelector('.hdl-modal > .hdl-content')
          modal.replaceChild(placeholder, component)
        },

        { once: true }
      )

      modal.classList.add('not-visible')
      main.classList.remove('blur')
    }
  })

  await import(`../../layouts/${layout}/index.js`)

  const tagName = layout.replaceAll('_', '-')
  const layoutComponent = document.createElement('hdl-' + tagName)
  layoutComponent.classList.add('absolute')
  layoutComponent.layoutContext = layoutContext
  document.querySelector('hdl-layout-placeholder').replaceWith(layoutComponent)

  const layoutHeaderComponentTag = `hdl-${tagName}-header`

  if (window.customElements.get(layoutHeaderComponentTag)) {
    const layoutHeaderComponent = document.createElement(layoutHeaderComponentTag)
    layoutHeaderComponent.classList.add('hdl-main-header-custom', 'border-box')
    layoutHeaderComponent.layoutContext = layoutContext
    document.querySelector('hdl-layout-header-placeholder').replaceWith(layoutHeaderComponent)
  }
}
