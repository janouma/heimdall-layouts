<svelte:options
  immutable={true}
  tag="hdl-dashboard-widget"
/>

<script>
  import 'joi'
  import { onDestroy } from 'svelte'
  import '../item/index.svelte'
  import { createValidator } from 'lib/validation.js'
  import { onLongTouch } from 'lib/events.js'
  import { getActionTag, isLink, dispatchContentDisplayEvent } from 'lib/item.js'

  export let title
  export let items
  export let messages
  export let maxvisible

  let list
  let controlsVisible = false
  let confirmPanelVisible = false

  const staticVars = {
    deleteTimeoutId: undefined,
    confirmTimeoutId: undefined
  }

  const { joi } = window
  const validate = createValidator('dashboard/widget')

  $: validate(title, 'title', joi.string())

  $: validate(
    items,
    'items',

    joi.array().items(
      joi.object({
        $id: joi.string().required(),
        title: joi.string().required(),
        url: joi.string(),
        snapshot: joi.alternatives().try(joi.string(), null),
        icon: joi.alternatives().try(joi.string(), null),
        type: joi.string().valid('url', 'text', 'javascript', 'css', 'html', 'shell', 'python', 'json')
      }).unknown().required()
    ).min(1)
  )

  $: validate(messages, 'messages', joi.object({
    iconalt: joi.string().required(),
    deletetitle: joi.string().required(),
    editTitle: joi.string().required(),
    confirmTitle: joi.string().required(),
    abortTitle: joi.string().required(),
    expandTitle: joi.string().required()
  }))

  $: validate(maxvisible, 'maxvisible', joi.number().integer())

  $: overflowed = maxvisible < items?.length

  onDestroy(() => {
    clearTimeout(staticVars.deleteTimeoutId)
    clearTimeout(staticVars.confirmTimeoutId)
  })

  function showItemContent (item) {
    dispatchContentDisplayEvent({ node: list, item })
  }

  function showRemoveButton () {
    const delay = 3000

    clearTimeout(staticVars.deleteTimeoutId)
    controlsVisible = true

    staticVars.deleteTimeoutId = setTimeout(() => { controlsVisible = false }, delay)
  }

  function showConfirmPanel () {
    const delay = 3000

    clearTimeout(staticVars.confirmTimeoutId)
    confirmPanelVisible = true

    staticVars.confirmTimeoutId = setTimeout(() => { confirmPanelVisible = false }, delay)

    if (controlsVisible) {
      showRemoveButton()
    }
  }

  function notifyExpand () {
    list?.parentNode.host.dispatchEvent(new window.CustomEvent('expand', { bubbles: false }))
  }

  function notifyEdit () {
    list?.parentNode.host.dispatchEvent(new window.CustomEvent('edit', { bubbles: false }))
  }

  function notifyRemoval (event) {
    event.stopPropagation()
    list?.parentNode.host.dispatchEvent(new window.CustomEvent('remove', { bubbles: false }))
  }

  function abortRemoval (event) {
    event.stopPropagation()
    clearTimeout(staticVars.confirmTimeoutId)
    confirmPanelVisible = false
  }

  export function scrollToTop () {
    list?.scrollTo({ top: 0, left: 0 })
  }
</script>

<style lang="postcss">
  @import '@heimdall/shared-lib/style/color.css';
  @import '@heimdall/shared-lib/style/animation/animated.css';
  @import '@heimdall/shared-lib/style/fx/hover_fx.css';
  @import '@heimdall/shared-lib/style/visibility/not_visible.css';
  @import '@heimdall/shared-lib/style/visibility/visible.css';

  :host {
    --border-radius: 0.391em;

    display: inline-block;
    border-radius: var(--border-radius);
    box-shadow: 0 0 1px 0 rgb(var(--eggshell));
  }

  ul {
    --gap: 0.14em;

    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    padding: 0;
    margin: 0;
    border-radius: var(--border-radius);
    overflow: hidden;
    isolation: isolate;
    scroll-snap-type: y mandatory;
    scroll-padding: calc(2 * var(--gap)) 0;
    user-select: none;

    &.animated {
      transition-property: box-shadow, scale;
    }

    &.overflowed {
      --item-height: 2.25em;
      --header-height: 2.625em;
      --max-height: calc(var(--header-height) + var(--max-visible) * (var(--item-height) + var(--gap)) - var(--gap));

      overflow: auto;
      overscroll-behavior: none;
      max-height: var(--max-height);
    }

    &.marked-for-control {
      box-shadow: 0 0 0 0.1em rgb(var(--eggshell));
      scale: 1.06;
    }
  }

  li {
    scroll-snap-align: start;

    &:not(:first-child):nth-child(2n + 1) {
      background-color: rgba(var(--eggshell), 25%);
    }

    &:first-child {
      --background-color: color-mix(in srgb, rgba(var(--gold), 90%), white 12.5%);

      padding: 0.556em 1em;
      background-image: linear-gradient(var(--background-color), rgba(var(--gold), 75%));
      color: rgb(var(--purple));
      position: sticky;
      box-sizing: border-box;
      top: 0;
      z-index: 1;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow: inset 0 0 1px 0 white;
        border-radius: var(--border-radius) var(--border-radius) 0 0;
      }

      @nest .overflowed &::after {
        --scrollbar-thumb-background-color-components: 0,0,0;
        --scrollbar-thumb-border-color-components: 255,255,255;

        content: '';
        position: absolute;
        top: calc(var(--header-height) + 0.5 * (var(--max-height) - var(--header-height)));
        transform: translateY(-50%);
        right: 1.5px;
        width: 6px;
        height: calc(0.4 * var(--max-height));
        background-color: rgba(var(--scrollbar-thumb-background-color-components), 50%);
        border: solid 1px rgba(var(--scrollbar-thumb-border-color-components), 33%);
        border-radius: 6px;
        @mixin animated;
      }

      @supports (-moz-appearance: none) {
        @nest .overflowed &::after {
          --scrollbar-thumb-background-color-components: 255,255,255;
          --scrollbar-thumb-border-color-components: 0,0,0;
        }
      }

      @nest .overflowed:hover &::after {
        visibility: hidden;
        opacity: 0;
      }
    }
  }

  h2 {
    letter-spacing: 0.075em;
    margin: 0;
    line-height: 1;
    white-space: pre;
    display: flex;
    font-variant-caps: small-caps;

    & > span {
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      display: inline-block;

      &::first-letter {
        text-transform: uppercase;
      }
    }
  }

  a,
  button {
    color: currentColor;
  }

  a {
    text-decoration: none;
  }

  .controls {
    --right-margin: 0.6em;
    --column-gap: calc(2 * var(--right-margin));

    position: absolute;
    display: flex;
    top: 50%;
    translate: 0 -50%;
    right: var(--right-margin);
    column-gap: var(--column-gap);

    & button {
      position: relative;

      &::before {
        content: '';
        position: absolute;
        width: 100%;
        aspect-ratio: 1;
        top: calc(-1 * var(--right-margin));
        left: calc(-1 * var(--right-margin));
        border-radius: 50%;
        border: solid var(--right-margin) transparent;
      }
    }

    & > * {
      @media (hover: hover) {
        @nest :host(:hover) :where(&) {
          visibility: visible;
          opacity: 1;
        }
      }
    }
  }

  button {
    cursor: pointer;
    padding: 0;
    border: none;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
    background-color: transparent;
  }

  .delete, .edit, .confirm, .abort, .expand {
    width: 1.5em;
    aspect-ratio: 1;
  }

  .delete {
    background-color: rgb(var(--red));
    border-radius: 50%;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    color: rgb(var(--eggshell));
    position: relative;

    &::after {
      content: '';
      height: 0.1875em;
      width: 65%;
      background-color: currentColor;
    }
  }

  .confirmPanel {
    --background-color: rgb(var(--deepwater));

    position: absolute;
    top: 50%;
    left: 0;
    translate: calc(-100% - var(--column-gap)) -50%;
    display: flex;
    column-gap: var(--column-gap);
    background-color: var(--background-color);
    box-shadow: 0 0 0 0.21em var(--background-color);
    border-radius: 0.75em;
  }

  .confirm, .abort {
    --background-shift: 0.125em;

    background-repeat: no-repeat;
    background-size: 75%;
  }

  .confirm {
    background-image: url(assets/images/yes.svg);
    background-position: center top var(--background-shift);
  }

  .abort {
    background-image: url(assets/images/no.svg);
    background-position: center bottom var(--background-shift);
  }

  .edit {
    background: no-repeat center/100%;
    background-image: url(assets/images/pencil.svg);
    transition-delay: 0.1s;
  }

  .expand {
    background: no-repeat center/75%;
    background-image: url(assets/images/expand.svg);
    box-sizing: border-box;
    border: 0.1em solid rgb(var(--eggshell));
    border-radius: 15%;
    transition-delay: 0.2s;
  }
</style>

<ul
  bind:this={list}
  class="animated"
  class:overflowed={overflowed}
  class:marked-for-control={controlsVisible}
  style:--max-visible={maxvisible}
  use:onLongTouch={showRemoveButton}
>
  <li>
    <h2>
      <span>{title}</span>
    </h2>
    <div class="controls">
      <button
        title={messages?.expandTitle}
        class="expand animated hover-fx not-visible"
        class:visible={controlsVisible}
        on:click={notifyExpand}
      ></button>

      <button
        title={messages?.editTitle}
        class="edit animated hover-fx not-visible"
        class:visible={controlsVisible}
        on:click={notifyEdit}
      ></button>

      <button
        title={messages?.deletetitle}
        class="delete animated not-visible"
        class:visible={controlsVisible}
        class:hover-fx={!confirmPanelVisible}
        on:click={showConfirmPanel}
      >
        <div class="confirmPanel animated not-visible" class:visible={confirmPanelVisible}>
          <button class="confirm animated hover-fx" title={messages?.confirmTitle}
            on:click={notifyRemoval}></button>

          <button class="abort animated hover-fx" title={messages?.abortTitle}
            on:click={abortRemoval}></button>
        </div>
      </button>
    </div>
  </li>

  {#if items?.length > 0}
    {#each items as item}
      <li class="animated hover-fx">
        <svelte:element
          this={getActionTag(item)}
          href={ isLink(item) ? item.url : undefined }
          on:click={ isLink(item) ? undefined : showItemContent(item) }
          rel="noopener"
          target="_blank"
        >
          <hdl-dashboard-item
            title={item.title} icon={item.icon} iconalt={messages?.iconalt}></hdl-dashboard-item>
        </svelte:element>
      </li>
    {/each}
  {/if}
</ul>
