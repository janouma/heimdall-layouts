<svelte:options
  immutable={true}
  tag="hdl-dashboard-item"
/>

<script>
  import 'joi'
  import { createValidator } from '^/lib/validation.js'

  export let title
  export let icon
  export let iconalt
  
  let label

  const { joi } = window
  const validate = createValidator('dashboard/item')

  $: validate(title, 'title', joi.string())
  $: validate(icon, 'icon', joi.alternatives().try(joi.string(), null))
  $: validate(iconalt, 'iconAlt', joi.string())
  $: alt = iconalt && `${iconalt} "${title}"`
</script>

<style lang="postcss">
  :host {
    display: flex;
    background-color: rgba(var(--deepspace), 40%);
    padding: 0.269em 0.606em;
    box-shadow: inset 0 0 1px 0 white;
  }

  .label {
    --x-padding: 0.65em;
    
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 0.419em;
    font-weight: bold;
    height: 1.688em;
    padding: 0 var(--x-padding);
    box-sizing: border-box;
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
    white-space: nowrap;
    overflow: hidden;
    flex: none;
  }
</style>

<div bind:this={label} class="label">
  {#if icon}
    <img {alt} src={icon}>
  {/if}
  <span class="title">{title}</span>
</div>
