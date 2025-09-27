<svelte:options immutable={true} />

<script context="module">
  import logger from '@byfrost/utils/logger.js'
  const log = logger.getLogger('layout/dashboard/component/body')
</script>

<script>
  import 'joi'
  import { onMount, onDestroy } from 'svelte'
  import { createValidator } from 'lib/validation.js'
  import { getConfig } from 'lib/config.js'
  import configUpdates from '../../lib/config_updates.js'
  import { gererateId } from '../../lib/utils.js'
  import '../hdl_dashboard_discovery/index.svelte'
  import '../hdl_dashboard_pin_board/index.svelte'
  import '../hdl_dashboard_search_builder/index.svelte'

  const componentDisplayName = 'dashboard/body'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let layoutContext

  let pined
  // FIXME: import messages from '../assets/messages.json' with { type: 'json' }
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
  $: pinedTitles = pined?.map(({ title }) => title)

  $: validate(layoutContext, 'layoutContext', joi.object().unknown())

  $: if (layoutContext) {
    layoutContext.sseClient.subscribe('notification', updateItems)
    layoutContext.sseClient.subscribe('notification', updateScopedConfig)
    layoutContext.sseClient.onConnect(updateConfig)
    layoutContext.sseClient.onConnectionRestored(updateConfig)
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
      layoutContext.sseClient.unsubscribe('notification', updateItems)
      layoutContext.sseClient.unsubscribe('notification', updateScopedConfig)
      layoutContext.sseClient.offConnect(updateConfig)
      layoutContext.sseClient.offConnectionRestored(updateConfig)
    }
  })

  async function getMessages () {
    const response = await fetch(import.meta.resolve('../assets/messages.json'))
    return response.json()
  }

  function updateItems ({ type }) {
    if (type === 'itemsUpdate') {
      return pinBoard?.refresh()
    }
  }

  function updateScopedConfig ({ scope }) {
    if (scope === 'dashboard') {
      return updateConfig()
    }
  }

  async function updateConfig ({ type } = {}) {
    if (type === 'configUpdate' || !type) {
      configFetched = false

      try {
        const config = await getConfig({
          layout: 'dashboard',
          updates: configUpdates
        })

        if (config) {
          ({ pined, reminded: remindedConfig } = config)
        }
      } finally {
        configFetched = true
      }
    }
  }

  function showItemContent ({ detail: item }) {
    log.debug('showing item', item)

    layoutContext?.mutations.setModal({
      component: 'content-viewer',

      params: {
        itemid: item.$id,
        type: item.type,
        title: item.title
      }
    })
  }

  function expandPinedSearch ({ detail: search }) {
    if (layoutContext) {
      layoutContext.mutations.setSearch({ ...search, max: 20 })
      layoutContext.mutations.switchToDefaultLayout()
    } else {
      log.warn('layoutContext is not set yet')
    }
  }

  function openSearchBuilder ({ detail: pinedConfig }) {
    log.debug(pinedConfig?.id ? `editing search "${pinedConfig.id}"` : 'adding search')

    layoutContext?.mutations.setModal({
      component: 'hdl-dashboard-search-builder',
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
