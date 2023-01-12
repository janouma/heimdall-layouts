<svelte:options
  immutable={true}
  tag="hdl-dashboard"
/>

<script>
  import 'joi'
  import { onMount, onDestroy, tick } from 'svelte'
  import { createValidator } from '^/lib/validation.js'
  import loglevelPlaceholder from '^/lib/loglevel_placeholder.js'
  import '../widget/index.svelte'
  import '../add_widget/index.svelte'
  import '../workspace_finder/index.svelte'

  const MAX_PINED = 4
  const componentDisplayName = 'dashboard/body'
  const staticVars = { log: loglevelPlaceholder.getLogger() }
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let layoutContext

  let lastItems = getItemsPlaceholders()
  let lastItemsWidget
  let pined
  let messages
  let pinedWidgetsProps

  $: session = layoutContext?.state.session
  $: workspaces = layoutContext?.state.workspaces
  $: userId = encodeURIComponent($session?.user.$id)

  $: notPined = $workspaces
    ?.filter(({ name }) => !pined?.includes(name))
    .map(({ name }) => name)

  $: limitReached = pined?.length >= MAX_PINED || notPined?.length === 0

  $: validate(layoutContext, 'layoutContext', joi.object().unknown())

  $: if (lastItemsWidget) {
    Object.assign(lastItemsWidget, {
      items: lastItems,
      messages: messages?.widget
    })
  }

  $: staticVars.log = layoutContext?.log.getLogger('layout/' + componentDisplayName)

  $: if (layoutContext) {
    layoutContext.sseClient.subscribe(
      `/api/${userId}/notification`,
      updateItems,
      logAnyError
    )

    layoutContext.sseClient.subscribe(
      `/api/${userId}/notification/dashboard`,
      updatePined,
      logAnyError
    )

    layoutContext.sseClient.onConnect(updateLastItems)
    layoutContext.sseClient.onConnect(updatePined)
  }

  $: if (pined) { updatePinedWidgetsProps() }

  onMount(async () => {
    messages = await getMessages()

    try {
      await Promise.all([
        updateLastItems(),
        updatePined()
      ])
    } catch (error) {
      staticVars.log.error(error.toString())
    }
  })

  onDestroy(() => {
    if (layoutContext) {
      layoutContext.sseClient.unsubscribe(`/api/${userId}/notification`, updateItems)
      layoutContext.sseClient.unsubscribe(`/api/${userId}/dashboard/notification`, updatePined)
      layoutContext.sseClient.offConnect(updateLastItems)
      layoutContext.sseClient.offConnect(updatePined)
    }
  })

  function logAnyError (error) {
    if (error) {
      staticVars.log.error(error.toString())
    }
  }

  function getItemsPlaceholders () {
    return Array.from({ length: 10 }, (value, index) => ({
      $id: String(index),
      title: getTitlePlaceholder(50),
      url: 'javascript:void(0)'
    }))
  }

  function getTitlePlaceholder (maxLength) {
    const length = Math.round(Math.random() * maxLength) + 15
    return ' '.repeat(length)
  }

  async function getMessages () {
    const { origin } = new URL(import.meta.url)
    const response = await fetch(origin + '/heimdall-layouts/layouts/dashboard/assets/messages.json')
    return response.json()
  }

  async function getLastItems () {
    const response = await fetch('/api/find-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({
        offset: 0,
        max: 10,
        includeDraft: true
      })
    })

    if (response.ok) {
      return response.json()
    } else {
      throw new Error('could not load last items')
    }
  }

  function updateItems ({ type }) {
    if (type === 'itemsUpdate') {
      return Promise.all([
        updateLastItems(),
        updatePinedWidgets()
      ])
    }
  }
  
  async function updateLastItems () {
    lastItems = await getLastItems()
  }
  
  async function updatePined () {
    pined = await getPined()
  }

  async function getPined () {
    const response = await fetch('/api/get-config/dashboard')
    const config = await response.json()
    return config?.pined
  }

  async function updatePinedWidgetsProps () {
    const pinedCountDiff = pined.length - getPinedWidgets().length

    if (Math.abs(pinedCountDiff) > 0) {
      pinedWidgetsProps ??= []
      const propsByTitle = groupBy('title', pinedWidgetsProps)

      pinedWidgetsProps = pined.map((title, index) => ({
        title,
        items: propsByTitle[title]?.items ?? getItemsPlaceholders()
      }))

      await tick()
      initPinedWidgets()
    }

    return updatePinedWidgets()
  }
  
  function getPinedWidgets () {
    return Array.from(lastItemsWidget?.parentNode.querySelectorAll('.pined'))
  }
  
  function initPinedWidgets () {
    getPinedWidgets().forEach((pinedWidget, index) => Object.assign(pinedWidget, {
      maxVisible: 10,
      items: pinedWidgetsProps[index].items,
      messages: messages?.widget
    }))
  }

  async function updatePinedWidgets () {
    const pinedWidgetsByTitle = groupBy('title', getPinedWidgets())

    for await (const fetchedProps of pined.map(getSingleWidgetProps)) {
      if (fetchedProps) {
        const { title, items } = fetchedProps

        pinedWidgetsProps = pinedWidgetsProps
          .map(props => title !== props.title ? props : fetchedProps)

        pinedWidgetsByTitle[title].items = items
      }
    }
  }

  function groupBy (prop, array) {
    return array.reduce(
      (groups, item) => Object.assign(
        groups,
        { [item[prop]]: item }
      ),
      {}
    )
  }

  async function getSingleWidgetProps (workspace) {
    try {
      const response = await fetch('/api/find-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          workspace,
          offset: 0,
          max: 300,
          includeDraft: true
        })
      })

      if (response.ok) {
        return {
          title: workspace,
          items: await response.json()
        }
      } else {
        staticVars.log.error(`could not load items of "${workspace}"`)
      }
    } catch (error) {
      staticVars.log.error(`could not load items of "${workspace}":\n`, error)
    }
  }

  function showItemContent ({ detail: item }) {
    staticVars.log.debug('showing item', item)

    layoutContext?.mutations.setModal({
      component: 'content-viewer',
      type: 'web-component',
      paramsHaveAccessors: true,

      params: {
        itemid: item.$id,
        type: item.type,
        title: item.title
      }
    })
  }

  function openWorkspaceFinder () {
    staticVars.log.debug('opening workspace finder')

    layoutContext?.mutations.setModal({
      component: 'hdl-dashboard-workspace-finder',
      type: 'web-component',
      paramsHaveAccessors: true,
      onMount (workspaceFinder) { workspaceFinder.addEventListener('pin', pinWorkspace) },

      params: {
        title: messages?.body.pickWorkspace,
        workspaces: notPined
      }
    })
  }

  async function pinWorkspace ({ detail: workspace }) {
    staticVars.log.debug('pining workspace', workspace)

    await fetch('/api/set-config/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({
        pined: pined?.length > 0
          ? Array.from(new Set([...pined, workspace]))
          : [workspace]
      })
    })

    layoutContext.mutations.setModal()
  }
  
  async function unPinWorkspace (workspace) {
    staticVars.log.debug('unpining workspace', workspace)

    if (pined) {
      return fetch('/api/set-config/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          pined: pined.filter(pinedWorkspace => pinedWorkspace !== workspace)
        })
      })
    }
  }
</script>

<style lang="postcss">
  :host {
    --main-header-height: 3.93em;
    --size-menu-width: 0;
    
    @media (width > env(--small-screen)) {
      --size-menu-width: 4.78em;
    }
    
    padding: var(--main-header-height) 0 0 var(--size-menu-width);
    box-sizing: border-box;
    display: block;
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .viewport {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    box-sizing: border-box;
    padding: 1.431em;
    column-gap: 2em;
    row-gap: 3.5em;

    @media (width > env(--small-screen)) {
      justify-content: flex-start;
    }
  }

  hdl-dashboard-widget,
  hdl-dashboard-add-widget {
    width: 25em;
  }

  hdl-dashboard-add-widget {
    min-height: 25.125em;
  }
</style>

<div class="viewport">
  <hdl-dashboard-widget
    bind:this={lastItemsWidget}
    title={messages?.body.recentlyAdded ?? getTitlePlaceholder(35)}
    on:show-item-content={showItemContent}
    readonly
  ></hdl-dashboard-widget>

  {#if pinedWidgetsProps?.length > 0}
    {#each pinedWidgetsProps as { title }}
      <hdl-dashboard-widget
        class="pined"
        {title}
        on:show-item-content={showItemContent}
        on:remove={unPinWorkspace(title)}
      ></hdl-dashboard-widget>
    {/each}
  {/if}

  {#if !limitReached}
    <hdl-dashboard-add-widget
      title={messages?.body.addWidget}
      on:click={openWorkspaceFinder}
    ></hdl-dashboard-add-widget>
  {/if}
</div>
