const { HTMLElement, customElements } = window
const template = document.createElement('template')

template.innerHTML = `
<style>
  /* :host {
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
  } */
  
  :host {
    display: contents;
  }
  
  :host > span {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
    height: var(--main-header-height);
    background-color: rgba(var(--deepwater), 60%);
    overflow: hidden;
    -webkit-backdrop-filter: var(--main-header-backdrop-filter);
    backdrop-filter: var(--main-header-backdrop-filter);
  }
</style>

<span>Dashboard Header</span>
<span>Part 2</span>
<span>Part 3</span>
`

class DashboardHeader extends HTMLElement {
  #shadow
  #layoutContext
  #unsubscribeFromSearch
  
  #onSseConnect () {
    console.debug('<hdl-dashboard-header/>.sseClient connected')
  }
  
  get layoutContext () {
    return this.#layoutContext
  }
  
  set layoutContext (layoutContext) {
	  this.#unsubscribeFromSearch?.()
	  this.#layoutContext = layoutContext
    this.#layoutContext.sseClient.offConnect(this.#onSseConnect)
    this.#layoutContext.sseClient.onConnect(this.#onSseConnect)
	  
	  this.#unsubscribeFromSearch = this.#layoutContext.state.search.subscribe(search => {
	    this.#shadow.querySelector(':host > span').textContent = 'Dashboard Header – search: ' + search.text
	  })
  }
  
  constructor () {
	  super()
    this.#shadow = this.attachShadow({ mode: 'closed' })
    this.#shadow.appendChild(template.content.cloneNode(true))
  }
  
  disconnectedCallback () {
    console.debug('<hdl-dashboard-header/> unmounted')
    this.#unsubscribeFromSearch?.()
    this.#layoutContext?.sseClient.offConnect(this.#onSseConnect)
  }
}

if (!customElements.get('hdl-dashboard-header')) {
	customElements.define('hdl-dashboard-header', DashboardHeader)	
}
