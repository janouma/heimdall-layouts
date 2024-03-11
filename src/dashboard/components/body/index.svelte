<svelte:options
  immutable={true}
  tag="hdl-dashboard"
/>

<script context="module">
  import logger from '@heimdall/utils/lib/logger.mjs'
  const log = logger.getLogger('layout/dashboard/component/body')
</script>

<script>
  import 'joi'
  import { onMount, onDestroy, tick } from 'svelte'
  import { createValidator } from 'lib/validation.js'
  import { getConfig } from 'lib/config.js'
  import configUpdates from './lib/config_updates.js'
  import { gererateId } from './lib/utils.js'
  import '../widget/index.svelte'
  import '../add_widget/index.svelte'
  import '../search_builder/index.svelte'
  import '../discovery/index.svelte'

  const MAX_PINED = 4
  const componentDisplayName = 'dashboard/body'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let layoutContext

  let pined
  let messages
  let pinedWidgets
  let viewport
  let remindedConfig
  let configFetched = false

  $: session = layoutContext?.state.session
  $: workspaces = layoutContext?.state.workspaces
  $: tags = layoutContext?.state.tags
  $: connections = layoutContext?.state.connections
  $: tagAliases = layoutContext?.computed.tagAliases
  $: userId = encodeURIComponent($session?.user.$id)
  $: limitReached = !configFetched || pined?.length >= MAX_PINED
  $: workspacesNames = $workspaces?.map(({ name }) => name)
  $: pinedTitles = pined?.map(({ title }) => title)

  $: validate(layoutContext, 'layoutContext', joi.object().unknown())

  $: if (layoutContext) {
    layoutContext.sseClient.subscribe(
      `/api/${userId}/notification`,
      updateItems,
      logAnyError
    )

    layoutContext.sseClient.subscribe(
      `/api/${userId}/notification/dashboard`,
      updateConfig,
      logAnyError
    )

    layoutContext.sseClient.onConnect(updateConfig)
  }

  $: if (pined) { updatePinedWidgets() }

  onMount(async () => {
    messages = await getMessages()

    try {
      await updateConfig()
    } catch (error) {
      log.error(error.toString())
    }
  })

  onDestroy(() => {
    if (layoutContext) {
      layoutContext.sseClient.unsubscribe(`/api/${userId}/notification`, updateItems)
      layoutContext.sseClient.unsubscribe(`/api/${userId}/dashboard/notification`, updateConfig)
      layoutContext.sseClient.offConnect(updateConfig)
    }
  })

  function logAnyError (error) {
    if (error) {
      log.error(error.toString())
    }
  }

  function getItemsPlaceholders (length, fill = ' ') {
    return Array.from({ length }, (_, index) => ({
      $id: String(index),
      title: getTitlePlaceholder(50, fill),
      url: 'javascript:void(0)'
    }))
  }

  function getTitlePlaceholder (maxLength, fill) {
    const length = Math.round(Math.random() * maxLength) + 15
    return fill.repeat(length)
  }

  async function getMessages () {
    const response = await fetch(import.meta.resolve('../assets/messages.json'))
    return response.json()
  }

  function updateItems ({ type }) {
    if (type === 'itemsUpdate') {
      return updatePinedWidgetsData()
    }
  }

  async function updateConfig () {
    configFetched = false

    const config = await getConfig({
      layout: 'dashboard',
      updates: configUpdates
    })

    if (config) {
      ({ pined, reminded: remindedConfig } = config)
    }

    configFetched = true
  }

  async function updatePinedWidgets () {
    const pinedCountDiff = pined.length - (pinedWidgets?.length ?? 0)

    if (Math.abs(pinedCountDiff) > 0) {
      pinedWidgets ??= []
      const propsById = groupBy('id', pinedWidgets)

      pinedWidgets = pined.map(({ id, title }, index) => ({
        id,
        title,
        items: propsById[id]?.items ?? getItemsPlaceholders(10)
      }))
    }

    return updatePinedWidgetsData()
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

  async function updatePinedWidgetsData () {
    for await (const fetchedProps of pined.map(getPinedWidgetData)) {
      if (fetchedProps) {
        const { id } = fetchedProps

        pinedWidgets = pinedWidgets
          .map(props => id !== props.id ? props : fetchedProps)

        tick()
          .then(() => viewport
            .querySelector('#' + id)?.scrollToTop())
      }
    }
  }

  async function getPinedWidgetData ({ id, title, search }) {
    try {
      const response = await fetch('/api/find-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(search)
      })

      if (response.ok) {
        return {
          id,
          title,
          items: await response.json()
        }
      } else {
        log.error(`could not load items of "${title}"(${id}) pined search`)
        log.debug('search:\n', search)
      }
    } catch (error) {
      log.error(`could not load items of "${title}"(${id}) pined search:\n`, error)
      log.debug('search:\n', search)
    }
  }

  function showItemContent ({ detail: item }) {
    log.debug('showing item', item)

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

  function expandPinedSearch (id) {
    const pinedConfig = pined.find(config => config.id === id)

    if (layoutContext) {
      layoutContext.mutations.setSearch(pinedConfig.search)
      layoutContext.mutations.switchToDefaultLayout()
    } else {
      log.warn('layoutContext is not set yet')
    }
  }

  function openSearchBuilder (id) {
    log.debug(id ? `editing search "${id}"` : 'opening search builder')

    const pinedConfig = pined?.find(config => config.id === id)

    layoutContext?.mutations.setModal({
      component: 'hdl-dashboard-search-builder',
      type: 'web-component',
      paramsHaveAccessors: true,
      onMount (searchBuilder) { searchBuilder.addEventListener('pin', pinSearch) },

      params: {
        messages: messages?.body.buildSearch,
        workspaces: workspacesNames,
        tags: $tags,
        tagaliases: $tagAliases,
        connections: $connections,
        user: $session?.user,
        forbiddennames: pinedTitles?.filter(title => title !== pinedConfig?.title),
        ...pinedConfig
      }
    })
  }

  async function pinSearch ({ detail: searchConfig }) {
    log.debug('pining search', searchConfig)

    const pinedSearch = {
      ...searchConfig,
      id: searchConfig.id || gererateId(searchConfig.title)
    }

    const replacedPinedSearchIndex = pined?.findIndex(({ id }) => pinedSearch.id === id) ?? -1

    const updatedPined = replacedPinedSearchIndex >= 0
      ? pined.with(replacedPinedSearchIndex, pinedSearch)
      : [...(pined ?? []), pinedSearch]

    await fetch('/api/set-config/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pined: updatedPined })
    })

    layoutContext.mutations.setModal()
  }

  async function unPinSearch (id) {
    log.debug('unpining search', id)

    if (pined) {
      return fetch('/api/set-config/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          pined: pined.filter(pinedSearch => pinedSearch.id !== id)
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
    --row-gap: 3.5em;

    padding: 1.431em 2.5em;

    & > *:not(:last-child) {
      margin-bottom: var(--row-gap);
    }
  }

  .widgets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(25em, 1fr));
    column-gap: 2em;
    row-gap: var(--row-gap);
  }

  hdl-dashboard-add-widget {
    min-height: 25.125em;
  }
</style>

<div bind:this={viewport} class="viewport">
  <hdl-dashboard-discovery
    initload={configFetched}
    config={remindedConfig}
    messages={messages?.reminder}
    on:show-item-content={showItemContent}
  ></hdl-dashboard-discovery>

  <section class="widgets">
    {#if pinedWidgets?.length > 0}
      {#each pinedWidgets as { id, title, items } (id)}
        <hdl-dashboard-widget
          class="pined"
          {id}
          {title}
          {items}
          messages={messages?.widget}
          maxvisible={10}
          on:show-item-content={showItemContent}
          on:expand={expandPinedSearch(id)}
          on:edit={openSearchBuilder(id)}
          on:remove={unPinSearch(id)}
        ></hdl-dashboard-widget>
      {/each}
    {/if}

    {#if !limitReached}
      <hdl-dashboard-add-widget
        title={messages?.body.addWidget}
        on:click={openSearchBuilder}
      ></hdl-dashboard-add-widget>
    {/if}
  </section>
</div>
