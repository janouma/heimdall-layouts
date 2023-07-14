<svelte:options
  immutable={true}
  tag="hdl-${__LAYOUT_FOLDER__.replaceAll('_', '-')}"
/>

<script>
  import 'joi'
  import { onMount } from 'svelte'
  import { createValidator } from '^/lib/validation.js'
  import { createResolver } from '^/lib/path.js'
  import loglevelPlaceholder from '^/lib/loglevel_placeholder.js'

  const componentDisplayName = '${__LAYOUT_FOLDER__}/body'
  const staticVars = { log: loglevelPlaceholder.getLogger() }
  const { joi } = window
  const validate = createValidator(componentDisplayName)
  const resolvePath = createResolver(import.meta.url)

  export let layoutContext

  let messages

  $: validate(layoutContext, 'layoutContext', joi.object().unknown())
  $: staticVars.log = layoutContext?.log.getLogger('layout/' + componentDisplayName)

  onMount(async () => { messages = await getMessages() })

  async function getMessages () {
    const response = await fetch(resolvePath('../assets/messages.json'))
    return response.json()
  }
</script>

<style lang="postcss">
  :host {
    --main-header-height: 3.93em;
    --side-menu-width: 0;
    
    @media (width > env(--small-screen)) {
      --side-menu-width: 4.78em;
    }
    
    padding: var(--main-header-height) 0 0 var(--side-menu-width);
    box-sizing: border-box;
    display: block;
    width: 100%;
    height: 100%;
    overflow: auto;
  }
</style>

<div class="viewport">
  <h2>{messages?.body.title}</h2>
</div>
