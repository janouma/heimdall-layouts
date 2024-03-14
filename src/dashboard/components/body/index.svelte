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
  import { onMount, onDestroy } from 'svelte'
  import { createValidator } from 'lib/validation.js'
  import { getConfig } from 'lib/config.js'
  import configUpdates from '../../lib/config_updates.js'
  import { gererateId } from '../../lib/utils.js'
  import '../discovery/index.svelte'
  import '../pin_board/index.svelte'
  import '../search_builder/index.svelte'

  const componentDisplayName = 'dashboard/body'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let layoutContext

  let pined
  let messages
  let remindedConfig
  let pinBoard
  let configFetched = false

  $: session = layoutContext?.state.session
  $: workspaces = layoutContext?.state.workspaces
  $: workspacesNames = $workspaces?.map(({ name }) => name)
  $: tags = layoutContext?.state.tags
  $: connections = layoutContext?.state.connections
  $: tagAliases = layoutContext?.computed.tagAliases
  $: userId = encodeURIComponent($session?.user.$id)
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

  async function getMessages () {
    const response = await fetch(import.meta.resolve('../assets/messages.json'))
    return response.json()
  }

  function updateItems ({ type }) {
    if (type === 'itemsUpdate') {
      return pinBoard?.refresh()
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

  function expandPinedSearch ({ detail: search }) {
    if (layoutContext) {
      layoutContext.mutations.setSearch(search)
      layoutContext.mutations.switchToDefaultLayout()
    } else {
      log.warn('layoutContext is not set yet')
    }
  }

  function openSearchBuilder ({ detail: pinedConfig }) {
    log.debug(pinedConfig?.id ? `editing search "${pinedConfig.id}"` : 'adding search')

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
    --pin-board-row-gap: var(--row-gap);

    padding: 1.431em 2.5em;

    & > *:not(:last-child) {
      margin-bottom: var(--row-gap);
    }
  }
</style>

<div class="viewport">
  <hdl-dashboard-discovery
    initload={configFetched}
    config={remindedConfig}
    messages={messages?.reminder}
    on:show-item-content={showItemContent}
  ></hdl-dashboard-discovery>

  <hdl-dashboard-pin-board
    bind:this={pinBoard}
    {pined}
    configfetched={configFetched}
    on:show-item-content={showItemContent}
    on:expand={expandPinedSearch}
    on:edit={openSearchBuilder}
    messages={messages?.pinBoard}
  ></hdl-dashboard-pin-board>
</div>
