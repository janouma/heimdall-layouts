const { HTMLElement, customElements } = window
const template = document.createElement('template')

template.innerHTML = `
<span>Dashboard</span>
`

class Dashboard extends HTMLElement {
  #contentRoot
  #shadow
  #layoutContext
  #unsubscribeFromSearch
  
  #onSseConnect () {
    console.debug('<hdl-dashboard/>.sseClient connected')
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
	    this.#contentRoot.querySelector(':scope > span').textContent = 'Dashboard – search: ' + search.text
	  })
    
    this.#layoutContext.addGlobalEventListener('full-items-search', this.#search)
  }
  
  constructor () {
	  super()
  
	  this.#contentRoot = document.createElement('div')
	  this.#contentRoot.setAttribute('id', 'content-root')
	  this.#contentRoot.appendChild(template.content.cloneNode(true))
  
	  this.#shadow = this.attachShadow({ mode: 'closed' })
	  this.#shadow.appendChild(this.#contentRoot)
  }
  
  disconnectedCallback () {
    console.debug('<hdl-dashboard/> unmounted')
    this.#unsubscribeFromSearch?.()
    this.#layoutContext?.removeGlobalEventListener('full-items-search', this.#search)
    this.#layoutContext.sseClient.offConnect(this.#onSseConnect)
  }
  
  #search = () => {
    console.debug('searching from dashboard')
    this.#layoutContext.actions.updateSearchResults()
  }
}

if (!customElements.get('hdl-dashboard')) {
	customElements.define('hdl-dashboard', Dashboard)	
}
