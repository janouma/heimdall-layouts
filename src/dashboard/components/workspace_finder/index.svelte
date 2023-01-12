<svelte:options
  immutable={true}
  tag="hdl-dashboard-workspace-finder"
/>

<style lang="postcss">
  @import '@heimdall/shared-lib/style/animation/animated.css';
  @import '@heimdall/shared-lib/style/fx/hover_fx.css';

  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75em;
    width: 100%;
    height: 100%;
    overflow: auto;
    isolation: isolate;
  }

  h2 {
    font-size: 2em;
    line-height: 1;
    position: sticky;
    top: 0em;
    z-index: 1;
    padding: 0.5em 0;
    margin: 0;
    background: rgba(var(--deepwater), 75%) radial-gradient(ellipse at bottom, transparent, rgb(var(--deepwater)) 65%);
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    color: rgba(var(--eggshell), 50%);

    &::first-letter {
      text-transform: uppercase;
    }
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    list-style: none;
    padding: 0;
    font-size: 1.5em;
    font-weight: bold;
    text-transform: capitalize;
    margin: 0;
    height: 100%;

    & button {
      background-color: transparent;
      text-align: left;
    }
  }

  li:first-child {
    margin-top: auto;
  }

  li:last-child {
    margin-bottom: auto;
  }

  button {
    color: currentColor;
    cursor: pointer;
    padding: 0;
    width: 100%;
    border: none;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    text-transform: inherit;
  }
</style>

<script>
  import 'joi'
  import { createValidator } from '^/lib/validation.js'

  export let title
  export let workspaces

  const { joi } = window
  const validate = createValidator('dashboard/add_widget')

  $: validate(title, 'title', joi.string())
  $: validate(workspaces, 'workspaces', joi.array().items(joi.string().required()).min(1))

  let list

  function pin (workspace) {
    list?.parentNode.host.dispatchEvent(new window.CustomEvent(
      'pin',

      {
        detail: workspace,
        bubbles: false
      }
    ))
  }
</script>

<h2>{title}</h2>

<ul bind:this={list}>
  {#if workspaces?.length > 0}
    {#each workspaces.slice().sort() as workspace}
      <li class="animated hover-fx">
        <button on:click={pin(workspace)}>{workspace}</button>
      </li>
    {/each}
  {/if}
</ul>
