<svelte:options
  immutable={true}
  tag="hdl-${__LAYOUT_FOLDER__.replaceAll('_', '-')}-${__COMPONENT_FOLDER__.replaceAll('_', '-')}"
/>

<script>
  import 'joi'
  import { createValidator } from '^/lib/validation.js'

  const componentDisplayName = '${__LAYOUT_FOLDER__}/${__COMPONENT_FOLDER__}'
  const { joi } = window
  const validate = createValidator(componentDisplayName)

  export let title

  $: validate(title, 'title', joi.string().min(3))
</script>

<style lang="postcss">
  :host {
    box-sizing: border-box;
    display: block;
  }
</style>

<h2>{title}</h2>
