<svelte:options
  immutable={true}
  tag="hdl-dashboard"
/>

<script>
  export let layoutContext
  let search

  $: if (layoutContext) {
    layoutContext.sseClient.offConnect(onSseConnect)
    layoutContext.sseClient.onConnect(onSseConnect);
    ({ search } = layoutContext.state)
  }
  
  function onSseConnect () {
    console.debug('<hdl-dashboard />.sseClient connected')
  }
</script>

<span>Dashboard - search: {$search?.text}</span>