<svelte:options
  immutable={true}
  tag="hdl-dashboard-discovery"
/>

<script context="module">
  import logger from '@heimdall/utils/lib/logger.mjs'
  const log = logger.getLogger('layout/dashboard/component/discovery')
</script>

<script>
  import 'joi'
  import { createValidator } from 'lib/validation.js'
  import { dispatchContentDisplayEvent } from 'lib/item.js'
  import '../reminder/index.svelte'

  const componentDisplayName = 'dashboard/discovery'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let config
  export let messages
  export let initload

  let root
  let items

  $: validate(config, 'config', joi.object({
    lastModified: joi.number().required(),

    items: joi.array().items(
      joi.object({
        $id: joi.string().required(),
        title: joi.string().required(),
        url: joi.string(),
        snapshot: joi.alternatives().try(joi.string(), null),
        icon: joi.alternatives().try(joi.string(), null),
        type: joi.string().valid('url', 'text', 'javascript', 'css', 'html', 'shell', 'python', 'json')
      }).unknown().required()
    ).min(1)
  }))

  $: root?.parentNode.host.classList.toggle('has-items', items?.length > 0)
  $: config && ({ items } = config)
  $: initload && loadReminded()

  async function loadReminded () {
    const SEVEN_DAYS = 604800000

    if (!config || (Date.now() - config.lastModified) >= SEVEN_DAYS) {
      try {
        items = await fetchItems()
      } catch (error) {
        log.error('could not load reminded items:\n', error)
      }
    }
  }

  async function fetchItems () {
    const DEFAULT_PAGE_SIZE = 20
    const baseSearch = { includeDraft: true }
    let itemsCount
    let fetchedItems

    {
      const response = await fetch('/api/count-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseSearch)
      })

      if (response.ok) {
        itemsCount = await response.json()
      } else {
        throw new Error('could not count items')
      }
    }

    if (itemsCount > 0) {
      const offsetLimit = Math.max(0, itemsCount - DEFAULT_PAGE_SIZE)

      const response = await fetch('/api/find-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          ...baseSearch,
          offset: Math.floor(Math.random() * offsetLimit)
        })
      })

      if (response.ok) {
        fetchedItems = await response.json()
      } else {
        throw new Error('could not load reminded items')
      }

      const chosenItems = pickItems(fetchedItems)

      await fetch('/api/set-config/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          reminded: {
            lastModified: Date.now(),

            items: chosenItems.map(
              ({ $id, title, url, snapshot, icon, type }) => ({ $id, title, url, snapshot, icon, type })
            )
          }
        })
      })

      return chosenItems
    }
  }

  function pickItems (source) {
    const pool = [...source]
    const chosen = []
    const chosenCount = Math.min(7, pool.length)

    for (let index = 0; index < chosenCount; index++) {
      const chosenIndex = Math.floor(Math.random() * pool.length)
      chosen.push(pool[chosenIndex])
      pool.splice(chosenIndex, 1)
    }

    return chosen
  }

  function showItemContent ({ detail: item }) {
    dispatchContentDisplayEvent({ node: root, item })
  }
</script>

<style lang="postcss">
  :host {
    &(.has-items) {
      display: inline-block;
    }

    & > div {
      display: contents;
    }
  }
</style>

<div bind:this={root}>
  {#if items?.length > 0}
    <hdl-dashboard-reminder
      {items}
      {messages}
      on:show-item-content={showItemContent}
    ></hdl-dashboard-reminder>
  {/if}
</div>
