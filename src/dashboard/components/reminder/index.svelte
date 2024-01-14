<svelte:options
  immutable={true}
  tag="hdl-dashboard-reminder"
/>

<script context="module">
  function createRange (start, end, includeLast = true) {
    return Array.from({ length: (end + (includeLast ? 1 : 0)) - start }, (v, i) => i + start)
  }

  function round (float, decimals = 0) {
    const multiplier = Math.max(1, 10 * decimals)
    return Math.round(float * multiplier) / multiplier
  }
</script>

<script>
  import 'joi'
  import { onMount, onDestroy } from 'svelte'
  import { render as renderMessage } from '@heimdall/utils/lib/template_string.mjs'
  import { debounce } from '@heimdall/utils/lib/function.mjs'
  import { createValidator } from 'lib/validation.js'
  import { getActionTag, isLink, dispatchContentDisplayEvent } from 'lib/item.js'

  export let items
  export let messages

  let carousel
  let maxPageSize = 1
  let currentPage = 0
  let hostWidth = 0

  const BASE_SIZE = 500
  const ANIMATION_DELAY = 5000

  const statics = {
    stopAnimation: undefined,
    resetAnimationTimer: undefined,
    debounceResetAnimationTimer: undefined
  }

  const resizeObserver = new window.ResizeObserver(elements => {
    const [{ contentBoxSize: [{ inlineSize }] }] = elements
    hostWidth = inlineSize
    maxPageSize = Math.floor(hostWidth / BASE_SIZE) + Math.round((hostWidth % BASE_SIZE) / BASE_SIZE)
    setCurrentPage()
  })

  const componentDisplayName = 'dashboard/reminder'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

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
    navButtonTitle: joi.string().required(),
    iconalt: joi.string().required(),
    snapshotalt: joi.string().required()
  }))

  $: pageSize = Math.min(items?.length || 1, maxPageSize)
  $: pagesCount = items?.length ? Math.ceil(items?.length / pageSize) : 0
  $: blur = round(hostWidth / (BASE_SIZE * (items?.length || 1)) / 37.5, 1)

  onMount(() => {
    resizeObserver.observe(carousel.parentNode.host)
    carousel.addEventListener('scroll', debounceSetCurrentPage)
    Object.assign(statics, startAnimation())
    statics.debounceResetAnimationTimer = debounce(statics.resetAnimationTimer, 100)
    carousel.addEventListener('wheel', statics.debounceResetAnimationTimer)
    carousel.addEventListener('touchstart', statics.debounceResetAnimationTimer)
  })

  onDestroy(() => {
    resizeObserver.disconnect()
    carousel.removeEventListener('scroll', debounceSetCurrentPage)

    if (statics.debounceResetAnimationTimer) {
      carousel.removeEventListener('wheel', statics.debounceResetAnimationTimer)
      carousel.removeEventListener('touchstart', statics.debounceResetAnimationTimer)
    }

    statics.stopAnimation?.()
  })

  function setCurrentPage () {
    const { scrollLeft, scrollWidth } = carousel
    currentPage = Math.round((scrollLeft / scrollWidth) * pagesCount)
  }

  const debounceSetCurrentPage = debounce(setCurrentPage, 50)

  function changePage (page) {
    goToPage(page)
    statics.resetAnimationTimer?.()
  }

  function goToPage (page) {
    const scrollLeft = Math.round((page / pagesCount) * carousel.scrollWidth)
    carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    currentPage = Math.round((scrollLeft / carousel.scrollWidth) * pagesCount)
  }

  function startAnimation () {
    const { requestAnimationFrame, cancelAnimationFrame } = window
    let start
    let frameId

    function frame (time) {
      start ??= time
      const enlapsed = time - start

      if (enlapsed >= ANIMATION_DELAY * pageSize) {
        start = time
        const nextPage = (currentPage + 1) % pagesCount
        goToPage(nextPage)
      }

      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)

    return {
      stopAnimation () {
        cancelAnimationFrame(frameId)
      },

      resetAnimationTimer () {
        start = undefined
      }
    }
  }

  function showItemContent (item) {
    dispatchContentDisplayEvent({ node: carousel, item })
  }
</script>

<style lang="postcss">
  @import '@heimdall/shared-lib/style/color.css';
  @import '@heimdall/shared-lib/style/geometry/stretch.css';
  @import '@heimdall/shared-lib/style/btn_spacing_reset.css';
  @import '@heimdall/shared-lib/style/animation/animated.css';

  :host {
    display: block;
    position: relative;
    height: min(26.385em, 90dvh);
    overflow: hidden;

    &, & * {
      box-sizing: border-box;
    }
  }

  ul, li {
    box-shadow: 0 0 1px 0 rgb(var(--sky)), inset 0 0 1px 0 rgb(var(--eggshell));
  }

  ul {
    list-style: none;
    display: flex;
    background-color: rgb(var(--eggshell));
    overflow-y: hidden;
    overflow-x: auto;
    overscroll-behavior: none;
    padding: 0;
    margin: 0;
    border-radius: 0.391em;
    height: 100%;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  li {
    flex: none;
    width: calc(100% / var(--page-size));
    scroll-snap-align: start;
    background: no-repeat center/cover url(assets/images/missing_snapshot.svg);
    overflow: hidden;

    &:nth-child(2n) h2 {
      --fill-color: var(--eggshell);
      --color: var(--deepwater);
    }

    &:nth-child(2n + 1) h2 {
      --fill-color: var(--deepspace);
      --color: var(--eggshell);
    }
  }

  .snapshot {
    position: absolute;
    top: 0;
    left: 0;
    object-position: center;
    object-fit: cover;
    filter: blur(calc(var(--blur) * 1em));
  }

  h2 {
    --gradient-size: 3em;

    position: relative;
    background-image: linear-gradient(transparent, rgba(var(--fill-color), 90%) var(--gradient-size));
    height: calc(2.62em + var(--gradient-size));
    line-height: 1.125;
    padding: 0.25em 0.375em;
    padding-top: calc(0.25em + var(--gradient-size));
    margin: 0;
    overflow: hidden;
    text-transform: capitalize;
    color: rgb(var(--color));
    letter-spacing: 0.05em;
  }

  nav {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 33%;
    display: flex;
    justify-content: center;
    align-items: start;
    pointer-events: none;
    column-gap: 1em;
    background-image: linear-gradient(rgba(var(--deepspace), 50%), transparent);
    padding-top: 0.75em;

    & button {
      position: relative;
      pointer-events: auto;
      width: 0.875em;
      aspect-ratio: 1;
      border-radius: 50%;
      background-color: rgb(var(--eggshell));
      border: none;
      box-shadow: 0 0 1px 0 rgb(var(--deepspace));

      &:not([disabled]) {
        cursor: pointer;
      }

      &.current {
        background-color: rgb(var(--gold));
      }

      &::after {
        --expanse: 50%;

        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        margin: calc(-1 * var(--expanse));
        padding: var(--expanse);
      }
    }

    @media (hover: none) {
      column-gap: 1.125em;

      & button {
        width: 1.5em;
      }
    }
  }

  .icon {
    position: absolute;
    top: 1.5em;
    left: 0.375em;
    width: 1.042em;
    aspect-ratio: 1;
    border-radius: 50%;
    object-fit: contain;
    box-sizing: border-box;
    border: 1px solid rgb(var(--sky));
    box-shadow: 0 0 0 1px rgb(var(--space));
    background-color: rgb(var(--eggshell));
    overflow: hidden;
  }

  .action {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    text-decoration: none;
    padding: 0;
    margin: 0;
    border: none;
    font-family: inherit;
    font-size: inherit;
    background-color: transparent;
    cursor: pointer;
  }
</style>

<ul bind:this={carousel} style:--page-size={pageSize}>
  {#if items?.length > 0}
    {#each items as item}
      <li>
        <svelte:element
          this={getActionTag(item)}
          href={ isLink(item) ? item.url : undefined }
          on:click={ isLink(item) ? undefined : showItemContent(item) }
          rel="noopener"
          target="_blank"
          class="stretch action"
        >
          {#if item.snapshot}
            <img class="snapshot stretch" src={item.snapshot} style:--blur={blur}
              alt={`${messages?.snapshotalt} "${item.title}"`}>
          {/if}
          <h2 class="hstretch">
            {item.title}
            {#if item.icon}
              <img class="icon" src={item.icon} alt={`${messages?.iconalt} "${item.title}"`}>
            {/if}
          </h2>
        </svelte:element>
      </li>
    {/each}
  {/if}
</ul>

{#if pagesCount > 1}
  <nav>
    {#each createRange(0, pagesCount, false) as page}
      <button class="animated"
        on:click={() => changePage(page)}
        class:current={currentPage === page} disabled={currentPage === page}
        title={messages && renderMessage(messages.navButtonTitle, { page: page + 1 })} />
    {/each}
  </nav>
{/if}
