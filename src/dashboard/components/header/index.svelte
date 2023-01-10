<svelte:options
  immutable={true}
  tag="hdl-dashboard-header"
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
    console.debug('<hdl-dashboard-header/>.sseClient connected')
  }
</script>

<style lang="postcss">
  :host {
    display: contents;

    & > span {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      height: var(--main-header-height);
      background-color: rgba(var(--deepwater), 60%);
      overflow: hidden;
      -webkit-backdrop-filter: var(--main-header-backdrop-filter);
      backdrop-filter: var(--main-header-backdrop-filter);
    }
  }
</style>

<span>Dashboard Header - search: {$search?.text}</span>
<span>Main</span>
<span>Tail</span>
