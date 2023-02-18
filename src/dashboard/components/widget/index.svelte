<svelte:options
  immutable={true}
  tag="hdl-dashboard-widget"
/>

<script>
  import 'joi'
  import '../item/index.svelte'
  import { createValidator } from '^/lib/validation.js'
  import { onLongTouch } from '^/lib/events.js'

  export let title
  export let items
  export let messages
  export let maxvisible
  export let readonly

  let list
  let deleteVisible = false
  
  const staticVars = { timeoutId: undefined }
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
    deletetitle: joi.string().required()
  }))
  
  $: validate(maxvisible, 'maxvisible', joi.number().integer())

  $: overflowed = maxvisible < items?.length

  // eslint-disable-next-line eqeqeq
  $: editable = readonly == undefined

  function getActionTag (item) {
    return isLink(item) ? 'a' : 'button'
  }
  
  function isLink (item) {
    return !item.type || item.type === 'url'
  }

  function showItemContent (item) {
    list?.parentNode.host.dispatchEvent(new window.CustomEvent(
      'show-item-content',

      {
        detail: item,
        bubbles: false
      }
    ))
  }
  
  function showRemoveButton () {
    const delay = 3000

    clearTimeout(staticVars.timeoutId)
    deleteVisible = true

    setTimeout(() => { deleteVisible = false }, delay)
  }

  function notifyRemoval () {
    list?.parentNode.host.dispatchEvent(new window.CustomEvent('remove'))
  }
</script>

<style lang="postcss">
  @import '@heimdall/shared-lib/style/animation/animated.css';
  @import '@heimdall/shared-lib/style/fx/hover_fx.css';
  @import '@heimdall/shared-lib/style/visibility/not_visible.css';
  @import '@heimdall/shared-lib/style/visibility/visible.css';
  
  :host {
    display: inline-block;
  }
  
  ul {
    --gap: 0.14em;
    --border-radius: 0.391em;
    
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
      overscroll-behavior: contain;
      max-height: var(--max-height);
    }

    &.marked-for-delete {
      box-shadow: 0 0 0 0.5em rgb(var(--pinkred));
      scale: 1.06;
    }
  }

  li {
    scroll-snap-align: start;

    &:first-child {
      padding: 0.556em 0.65em;
      background-color: rgba(var(--deepwater), 75%);
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
    text-transform: capitalize;
    margin: 0;
    line-height: 1;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  a,
  button {
    color: currentColor;
  }
  
  a {
    text-decoration: none;
  }
  
  button {
    cursor: pointer;
    padding: 0;
    width: 100%;
    border: none;
    font-family: inherit;
    font-size: inherit;
  }

  .delete {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 0.4em;
    width: 1em;
    aspect-ratio: 1;
    background-color: rgb(var(--red));
    border: 1px solid rgb(var(--eggshell));
    border-radius: 50%;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;

    &::before {
      --expanse: 50%;
    
      content: '';
      position: absolute;
      width: 100%;
      aspect-ratio: 1;
      top: 0;
      left: 0;
      border-radius: 50%;
      margin: calc(-1 * var(--expanse));
      padding: var(--expanse);
    }

    &::after {
      content: '';
      height: 0.125em;
      width: 65%;
      background-color: currentColor;
    }

    @media (hover: hover) {
      @nest :host(:hover) :where(&) {
        visibility: visible;
        opacity: 1;
      }
    }
  }
</style>

<ul
  bind:this={list}
  class="animated"
  class:overflowed={overflowed}
  class:marked-for-delete={editable && deleteVisible}
  style:--max-visible={maxvisible}
  use:onLongTouch={editable && showRemoveButton}
>
  <li>
    <h2>
      {title}
      {#if editable}
        <button
          title={messages?.deletetitle}
          class="delete animated hover-fx not-visible"
          class:visible={deleteVisible}
          on:click={notifyRemoval}
        ></button>
      {/if} 
    </h2>
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
            title={item.title}
            snapshot={item.snapshot}
            icon={item.icon}
            iconalt={messages?.iconalt}
            type={item.type}
          ></hdl-dashboard-item>
        </svelte:element>
      </li>
    {/each}
  {/if}
</ul>
