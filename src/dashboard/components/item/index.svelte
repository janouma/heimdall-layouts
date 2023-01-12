<svelte:options
  immutable={true}
  tag="hdl-dashboard-item"
/>

<script>
  import 'joi'
  import { createValidator } from '^/lib/validation.js'
  import { createResolver } from '^/lib/path.js'
  
  export let title
  export let snapshot
  export let icon
  export let iconalt
  export let type
  
  let label

  const { joi } = window
  const resolvePath = createResolver(import.meta.url)
  const validate = createValidator('dashboard/item')

  $: validate(title, 'title', joi.string())
  $: validate(snapshot, 'snapshot', joi.alternatives().try(joi.string(), null))
  $: validate(icon, 'icon', joi.alternatives().try(joi.string(), null))
  $: validate(iconalt, 'iconAlt', joi.string())
  $: validate(type, 'type', joi.string().valid('url', 'text', 'javascript', 'css', 'html', 'shell', 'python', 'json'))
  
  $: alt = iconalt && `${iconalt} "${title}"`

  $: if (type && type !== 'url') {
    label?.parentNode.host.classList.add('snippet', type)
    label?.parentNode.host.style.setProperty('--snippet-background', `url(${resolvePath('assets/images/snippet_snapshot.svg')})`)
  }

  $: if (snapshot?.trim()) {
    label?.parentNode.host.style.setProperty('--snapshot', `url(${snapshot})`)
  }
</script>

<style lang="postcss">
  :host {
    display: flex;
    background: var(--snapshot) center/cover;
    background-color: rgba(var(--eggshell), 75%);
    padding: 0.269em 0.606em;
    box-shadow: inset 0 0 1px 0 white;
  }

  :host(.snippet) {
    background-image: var(--snippet-background);
    background-size: 400% auto;
  }
  
  :host(.text.snippet) {
    background-position: 100% 25%;
  }
  
  :host(.javascript.snippet) {
    background-position: 31.5% 25%;
  }
  
  :host(.css.snippet) {
    background-position: 0 25%;
  }
  
  :host(.html.snippet) {
    background-position: 65% 25%;
  }
  
  :host(.shell.snippet) {
    background-position: 0 75%;
  }
  
  :host(.python.snippet) {
    background-position: 31.5% 75%;
  }
  
  :host(.json.snippet) {
    background-position: 65% 75%;
  }

  .label {
    --x-padding: 0.65em;
    
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 0.419em;
    background-color: rgba(var(--deepwater), 75%);
    height: 1.688em;
    padding: 0 var(--x-padding);
    box-sizing: border-box;
    border-radius: 1em;
    box-shadow: 0 0 1px 0 white;
    max-width: 100%;
  }
  
  .title {
    font-weight: bold;
    white-space: pre;
    text-transform: capitalize;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  img {
    --size: 1.563em;

    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    object-fit: contain;
    box-sizing: border-box;
    border: 1px solid rgb(var(--sky));
    box-shadow: 0 0 0 1px rgb(var(--space));
    margin-left: calc(-1 * var(--x-padding) + 1px);
    background-color: rgb(var(--eggshell));
  }
</style>

<div bind:this={label} class="label">
  {#if icon}
    <img {alt} src={icon}>
  {/if}
  <span class="title">{title}</span>
</div>
