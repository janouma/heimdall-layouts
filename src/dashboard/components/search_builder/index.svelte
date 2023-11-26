<svelte:options
  immutable={true}
  tag="hdl-dashboard-search-builder"
/>

<script context="module">
  import logger from '@heimdall/utils/lib/logger.mjs'

  const log = logger.getLogger('layout/dsahboard/component/search_builder')
  const validSearchName = /^.*\S.{3,}\S.*$/
</script>

<script>
  import 'joi'
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { quintInOut } from 'svelte/easing'
  import '@heimdall/shared-lib/components/search_bar/index.svelte'
  import '@heimdall/shared-lib/components/folder_browser/index.svelte'
  import { debounce } from '@heimdall/utils/lib/function.mjs'
  import { createValidator } from 'lib/validation.js'
  import '../item/index.svelte'

  const DRAFT_TAG_NAME = 'draft'
  const DEFAULT_MAX = 20
  const componentDisplayName = 'dashboard/search_builder'
  const { joi } = window
  const limitStep = 20
  const limitMarkers = new Array(5).fill().map((item, index) => (index + 1) * limitStep)
  const minLimit = limitMarkers.at(0)
  const maxLimit = limitMarkers.at(-1)
  const validate = createValidator(componentDisplayName)

  const userSchema = joi.object({
    $id: joi.string().required(),
    username: joi.string().required()
  }).unknown()

  export let search = { max: DEFAULT_MAX, includeDraft: false, tags: [], connectees: [] }
  export let messages
  export let workspaces
  export let id
  export let title
  export let tags
  export let tagaliases
  export let connections
  export let user
  export let forbiddennames

  let mounted = false
  let searching = false
  let includeDraft
  let userSelectedIncludeDraft
  let max
  let workspace
  let tagsFilter
  let connecteesFilter
  let freeTextFilter
  let items
  let header

  $: ({
    max = DEFAULT_MAX, workspace, includeDraft, includeDraft: userSelectedIncludeDraft = false,
    tags: tagsFilter = [], connectees: connecteesFilter = [], text: freeTextFilter
  } = search)

  $: includeDraft = (workspace ? true : userSelectedIncludeDraft) ||
    (tagsFilter?.includes(DRAFT_TAG_NAME) ? true : userSelectedIncludeDraft)

  $: host = header?.parentNode.host
  $: name = title
  $: nameFilled = Boolean(name?.trim())
  $: cleanName = name?.trim().toLowerCase()
  $: forbiddenName = forbiddennames?.includes(cleanName)
  $: canSave = name?.match(validSearchName) && !forbiddenName
  $: previewPlaceholder = messages?.searching
  $: draftSwitchDisabled = Boolean(workspace) || tagsFilter?.includes(DRAFT_TAG_NAME)

  $: newSearch = {
    max,
    includeDraft,
    ...(workspace && { workspace }),
    tags: tagsFilter,
    connectees: connecteesFilter,
    ...(freeTextFilter && { text: freeTextFilter })
  }

  /* eslint-disable-next-line key-spacing */
  $: gauge = { 20:10, 40:32.5, 60:55, 80:77, 100:100 }[max]

  $: validate(messages, 'messages', joi.object({
    titlePlaceholder: joi.string().required(),
    limit: joi.string().required(),
    drafts: joi.string().required(),
    iconalt: joi.string().required(),
    preview: joi.string().required(),
    noPreview: joi.string().required(),
    searching: joi.string().required(),
    pin: joi.string().required(),

    searchBar: joi.object({
      searchNItems: joi.string().required()
    }).required()
  }))

  $: validate(workspaces, 'workspaces', joi.array().items(joi.string()).sparse(false))

  $: validate(search, 'search', joi.object({
    workspace: joi.string(),
    max: joi.number(),
    includeDraft: joi.boolean(),
    tags: joi.array().items(joi.string()).sparse(false),
    connectees: joi.array().items(joi.string()).sparse(false)
  }))

  $: validate(tags, 'tags', joi.array().items(
    joi.object({ name: joi.string().required() }).required().unknown())
  )

  $: validate(tagaliases, 'tagaliases', joi.object().unknown())
  $: validate(user, 'user', userSchema)
  $: validate(connections, 'connections', joi.array().items(userSchema).sparse(false))

  $: if (mounted) {
    /* eslint-disable-next-line no-use-before-define */
    updatePreview(newSearch)
  }

  onMount(async () => {
    mounted = true
    document.addEventListener('keydown', preventDefaultEscape)
  })

  onDestroy(() => document.removeEventListener('keydown', preventDefaultEscape))

  var updatePreview = debounce(async function updatePreview (newSearch) {
    previewPlaceholder = messages?.searching
    searching = true

    try {
      const response = await fetch('/api/find-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSearch)
      })

      items = await response.json()
    } catch (error) {
      log.error('failed to load preview for search', newSearch, 'due to error:\n', error)
    } finally {
      searching = false
      previewPlaceholder = messages?.noPreview
    }
  }, 500)

  function preventDefaultEscape (keyboardEvent) {
    log.debug({ key: keyboardEvent.key })

    if (keyboardEvent.key === 'Escape' && host === document.activeElement) {
      keyboardEvent.stopImmediatePropagation()
    }
  }

  function setWorkspace ({ detail }) {
    workspace = detail
  }

  function updateSearch ({ detail: updatedSearch }) {
    ({ tags: tagsFilter, connectees: connecteesFilter, text: freeTextFilter } = updatedSearch)
  }

  function setUserSelectedIncludeDraft ({ target }) {
    userSelectedIncludeDraft = target.checked
  }

  function pinSearch () {
    host.dispatchEvent(new window.CustomEvent('pin', {
      detail: {
        ...(id && { id }),
        title: cleanName,

        search: {
          ...newSearch,
          includeDraft: userSelectedIncludeDraft
        }
      },

      bubbles: false
    }))
  }
</script>

<style lang="postcss">
  @import '@heimdall/shared-lib/style/color.css';
  @import '@heimdall/shared-lib/style/form/index.css';
  @import '@heimdall/shared-lib/style/animation/animated.css';
  @import '@heimdall/shared-lib/style/layout/inline_flex.css';
  @import '@heimdall/shared-lib/style/typography/index.css';
  @import '@heimdall/shared-lib/style/geometry/stretch.css';
  @import '@heimdall/shared-lib/style/fx/hover_fx.css';
  @import '@heimdall/shared-lib/style/visibility/dimmed.css';

  :host {
    --yes: ;
    --no: initial;

    box-sizing: border-box;
    display: block;
    width: 100%;
    min-height: 100%;
    padding: 1em;
    isolation: isolate;
  }

  h2 {
    display: flex;
    justify-content: center;
    font-size: 2em;
    line-height: 1;
    width: 100%;
    box-sizing: border-box;
    padding: 0;
    margin: 2em 0 1.5em 0;
    isolation: isolate;
    position: relative;

    &, input {
      font-variant-caps: small-caps;
    }

    &::before {
      --padding: 0.375em;

      content: attr(title);
      position: absolute;
      left: 50%;
      top: 50%;
      translate: -50% -50%;
      white-space: nowrap;
      color: rgba(var(--eggshell), 35%);
      box-sizing: border-box;
      padding: 0.125em var(--padding) var(--padding) var(--padding);
      background-color: rgba(var(--deepspace), 50%);
      border-radius: 0.14em;
      @mixin animated;
      @mixin box-underline;
    }

    &:not(.filled):has(input:focus)::before {
      color: rgba(var(--eggshell), 20%);
    }

    &.filled::before {
      opacity: 0;
      visibility: hidden;
    }
  }

  input[name="title"] {
    font-size: inherit;
    text-align: center;
    width: 100%;
    height: 1em;
    margin-top: -0.25em;
    z-index: 1;
    position: relative;
    border: none;
    box-sizing: border-box;
    padding: 0;
    font-weight: bold;

    &::placeholder {
      visibility: hidden;
      color: transparent;
    }
  }

  header, .main {
    width: clamp(50%, 100%, 35.36em);
    max-width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    row-gap: 1em;
    margin-inline: auto;
  }

  header {
    z-index: 1;
    position: relative;
  }

  h3 {
    font-variant-caps: small-caps;
    letter-spacing: 0.1em;
    margin: 2em 0 0 0;
    font-size: 1.375em;
    text-align: center;
  }

  .icons-wrapper {
    z-index: 1;
    column-gap: 5%;
    position: relative;
    display: flex;
    align-items: center;
  }

  .max-wrapper {
    column-gap: 0.75em;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: flex-end;

    & label {
      text-align: center;
      font-weight: bold;
    }
  }

  .max {
    width: 60%;
    max-width: 12.5em;
    row-gap: 0.42em;
    isolation: isolate;
    display: flex;
    flex-direction: column;

    & .markers {
      font-size: 0.8em;
      pointer-events: none;
      position: relative;
      display: flex;
      justify-content: space-between;
      box-sizing: border-box;

      &::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 1px;
        bottom: 0;
        background-color: rgba(var(--eggshell), 75%);
      }

      &::after {
        content: "";
        position: absolute;
        width: calc(var(--gauge) * 1%);
        height: 0.14em;
        bottom: 0;
        translate: 0 33%;
        background-color: rgb(var(--sky));
        @mixin animated;
      }

      & > * {
        width: 2ch;
        display: flex;
        justify-content: center;
        position: relative;

        &.selected {
          color: rgb(var(--sky));
          font-weight: bold;
        }

        &::after {
          content: "|";
          position: absolute;
          top: 100%;
          left: 50%;
        }
      }
    }
  }

  input[type="range"] {
    appearance: none;
    width: 100%;
    height: 0.5em;
    background-color: transparent;
    cursor: pointer;
    z-index: 1;
    margin: 0;

    &:focus {
      outline: none;
    }
  }

  folder-browser {
    --folder-browser-large-text: var(--yes);
    --folder-browser-full-width: var(--yes);
    --folder-browser-y-offset: 1em;
    --folder-browser-no-backdrop-filter: var(--yes);
    --folder-browser-max-visible-rows: 7;

    display: inline-flex;

    @media (width > env(--small-screen)) {
      --folder-browser-large-text: var(--no);
      --folder-browser-full-width: var(--no);
      --folder-browser-y-offset: 1.25em;
      --folder-browser-max-columns: 3;
      --folder-browser-max-visible-rows: 10;
    }
  }

  .draft-switch {
    column-gap: 0.75em;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-weight: bold;

    & input[type="checkbox"] {
      flex: none;
    }

    &:has(input[disabled]) {
      cursor: not-allowed;
    }
  }

  search-bar {
    --background-color: var(--deepspace);
    --search-bar-completion-background-color: rgba(var(--background-color), 80%);
    --search-bar-completion-border: var(--yes);

    width: 100%;
    height: 3.93em;
    background-color: rgba(var(--background-color), 50%);
    border-radius: 0.14em;
    box-shadow: 0 0 1px 0 rgb(var(--sky));
  }

  .preview {
    --item-height: 2.25em;

    background-color: var(--transluent);
    position: relative;

    &::before {
      content: attr(data-placeholder);
      position: absolute;
      top: 50%;
      left: 50%;
      translate: -50% -50%;
      visibility: hidden;
      opacity: 0;
      @mixin animated;
    }
  }

  .preview:empty {
    --min-rows: 10;
    --min-height: calc(var(--min-rows) * var(--item-height));

    min-height: var(--min-height);

    &::before {
      visibility: visible;
      opacity: 1;
    }
  }

  ul {
    --max-rows: 10;
    --max-height: calc(var(--max-rows) * var(--item-height));

    list-style: none;
    overflow: hidden;
    scroll-snap-type: y mandatory;
    user-select: none;
    overflow: auto;
    overscroll-behavior: none;
    max-height: var(--max-height);
    margin: 0;
    padding: 0;

    @media (height > 65em) {
      --max-rows: 15;
    }

    @media (height > 85em) {
      --max-rows: 20;
    }
  }

  button {
    cursor: pointer;
    padding: 0;
    border: none;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  .pin {
    font-size: 2em;
    margin: 1em 0 0 0;
    padding: 0 0.375em;
    border-radius: 0.15em;
    line-height: 1.71;
    letter-spacing: 0.05em;
    background-color: var(--transluent);
    margin-inline: auto;
    font-weight: bold;

    &::before {
      content: "";
      display: inline-block;
      height: 0.75em;
      aspect-ratio: 0.775;
      rotate: 30deg;
      translate: 0 0.05em;
      background: no-repeat center/100%;
      background-image: url(assets/images/pin.svg);
      margin-right: 0.375em;
    }
  }
</style>

<h2 class:filled={nameFilled} title={messages?.titlePlaceholder}>
  <input type="text" name="title" bind:value={name}
    placeholder={messages?.titlePlaceholder} pattern={validSearchName.source} class:invalid={forbiddenName}
    class="no-focus bg-transparent animated sky"/>
</h2>

<header bind:this={header}>
  <div class="icons-wrapper">
    <folder-browser items={workspaces} selected={workspace}
      on:change={setWorkspace}></folder-browser>

    <label for="includeDraft" class="draft-switch animated">
      <input id="includeDraft" type="checkbox" class="animated" disabled={draftSwitchDisabled}
        bind:checked={includeDraft} on:change={setUserSelectedIncludeDraft}/>
      <span class="cap-first animated"
        class:dimmed={Boolean(workspace) || !includeDraft}>{messages?.drafts}</span>
    </label>

    <div class="max-wrapper">
      <label for="max" class="cap-first">{messages?.limit}</label>

      <div class="max">
        <div class="markers hstretch"
          style="--gauge:{gauge}">
          {#each limitMarkers as marker}
            <span class:selected={marker === max} class="animated">
              {marker}
            </span>
          {/each}
        </div>

        <input id="max" name="max" bind:value={max} class="hstretch" type="range" min={minLimit}
          max={maxLimit} step={limitStep} />
      </div>
    </div>
  </div>

  <search-bar activableelement={host} {searching} itemscount={items?.length || 0}
    {tags} {tagaliases} {user} {connections} messages={messages?.searchBar}
    on:search-update={updateSearch} search={newSearch}></search-bar>
</header>

<section class="main">
  <h3 class="cap-first">{messages?.preview}</h3>

  <div data-placeholder={previewPlaceholder} class="preview">
    {#if !searching && items?.length > 0}
      <ul transition:fade={{ duration: 250, easing: quintInOut }}>
        {#each items as item}
        <li class="animated hover-fx">
          <hdl-dashboard-item
            title={item.title} icon={item.icon} iconalt={messages?.iconalt}></hdl-dashboard-item>
        </li>
        {/each}
      </ul>
    {/if}
  </div>

  <button class="pin capitalize animated hover-fx" disabled={!canSave}
    on:click={pinSearch}>{messages?.pin}</button>
</section>
