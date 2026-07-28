export function getComponentHelpers ({ layout, component, main = false } = {}) {
  if (!layout) { throw new Error('layout argument is missing') }
  if (!main && !component) { throw new Error('component argument is missing') }

  let componentId
  let componentName

  if (main) {
    componentId = componentName = 'main'
  } else {
    componentId = component
    componentName = `hdl_${layout}_${component}`
  }

  const testViewsPath = `/tests/suites/${layout}/${componentName}/views`

  return {
    getComponentUrl ({ params = null, case: useCase } = {}) {
      const parsedParams = params
        ? Object.entries(params).reduce(
          (parsed, [key, value]) => Object.assign(
            parsed,
            { [key]: value !== undefined ? value : '<undefined>' }
          ),
          {}
        )
        : params

      const htmlFile = useCase ? useCase + '.html' : ''
      return `${testViewsPath}/${htmlFile}?env=playwright&params=${encodeURIComponent(JSON.stringify(parsedParams))}`
    },

    getComponentAssetPath (asset) {
      if (!asset) { throw new Error('asset argument is missing') }
      return `${testViewsPath}/assets/${asset}`
    },

    getScreenshotPath (useCase, name = 'screenshot') {
      if (!useCase) { throw new Error('useCase argument is missing') }
      return [useCase, `${componentId}-${name}.png`]
    },

    tag: main ? 'body' : `hdl-${layout}-${componentId.replaceAll('_', '-')}`
  }
}
