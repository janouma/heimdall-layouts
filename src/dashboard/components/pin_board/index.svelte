<svelte:options
  immutable={true}
  tag="hdl-dashboard-pin-board"
/>

<script context="module">
  import logger from '@heimdall/utils/lib/logger.mjs'
  const log = logger.getLogger('layout/dashboard/component/pin_board')
</script>

<script>
  import 'joi'
  import { tick } from 'svelte'
  import { createValidator } from 'lib/validation.js'
  import { dispatchContentDisplayEvent } from 'lib/item.js'
  import '../widget/index.svelte'
  import '../add_widget/index.svelte'

  const MAX_PINED = 4
  const componentDisplayName = 'dashboard/pin_board'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let pined
  export let messages
  export let configfetched

  let root
  let pinedWidgets

  $: validate(pined, 'pined', joi.array().items(
    joi.object({
      id: joi.string().required(),
      title: joi.string().required(),
      search: joi.object().required()
    })
  ))

  $: validate(messages, 'messages', joi.object({
    widget: joi.object().required(),
    addWidget: joi.string().required()
  }))

  $: validate(configfetched, 'configfetched', joi.boolean())

  $: limitReached = !configfetched || pined?.length >= MAX_PINED

  $: if (pined) { updateWidgets() }

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

  async function updateWidgets () {
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

    return refresh()
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

  export async function refresh () {
    for await (const fetchedProps of pined.map(getWidgetData)) {
      if (fetchedProps) {
        const { id } = fetchedProps

        pinedWidgets = pinedWidgets
          .map(props => id !== props.id ? props : fetchedProps)

        tick()
          .then(() => root
            .querySelector('#' + id)?.scrollToTop())
      }
    }
  }

  async function getWidgetData ({ id, title, search }) {
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

  function expand (id) {
    const { search } = pined.find(config => config.id === id)

    root?.parentNode.host.dispatchEvent(new window.CustomEvent(
      'expand',

      {
        detail: search,
        bubbles: false
      }
    ))
  }

  function edit (id) {
    const pinedConfig = pined?.find(config => config.id === id)

    root?.parentNode.host.dispatchEvent(new window.CustomEvent(
      'edit',

      {
        detail: pinedConfig,
        bubbles: false
      }
    ))
  }

  async function unPin (id) {
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

  function showItemContent ({ detail: item }) {
    dispatchContentDisplayEvent({ node: root, item })
  }
</script>

<style lang="postcss">
  :host {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(25em, 1fr));
    column-gap: 2em;
    row-gap: var(--pin-board-row-gap, 3.5em);

    & > div {
      display: contents;
    }
  }

  hdl-dashboard-add-widget {
    min-height: 25.125em;
  }
</style>

<div bind:this={root}>
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
        on:expand={expand(id)}
        on:edit={edit(id)}
        on:remove={unPin(id)}
      ></hdl-dashboard-widget>
    {/each}
  {/if}

  {#if !limitReached}
    <hdl-dashboard-add-widget
      title={messages?.addWidget}
      on:click={edit}
    ></hdl-dashboard-add-widget>
  {/if}
</div>
