<svelte:options
  immutable={true}
  tag="hdl-dashboard-add-widget"
/>

<script>
  import 'joi'
  import { createValidator } from 'lib/validation.js'
  
  export let title
  
  const { joi } = window
  const validate = createValidator('dashboard/add_widget')
  
  $: validate(title, 'title', joi.string())
</script>

<style lang="postcss">
  @import '@heimdall/shared-lib/style/animation/animated.css';

  :host {
    display: inline-block;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    color: currentColor;
    cursor: pointer;
    box-sizing: border-box;
    padding: 0.625em;
    width: 100%;
    height: 100%;
    border: none;
    font-family: inherit;
    font-size: inherit;
    background-color: rgba(var(--deepwater), 50%);
    box-shadow: inset 0 0 1px 0 white;
    border-radius: 0.391em;

    &:hover {
      background-color: rgba(var(--space), 50%);
    }

    &::after {
      content: '✕';
      display: flex;
      justify-content: center;
      align-items: center;
      transform: rotateZ(45deg);
      box-sizing: border-box;
      font-size: 2.25em;
      width: 1.511em;
      aspect-ratio: 1;
      border: 0.128em solid;
      border-radius: 50%;
      font-weight: bold;
      opacity: 50%;
    }
  }
</style>

<button class="animated" {title}></button>
