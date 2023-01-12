export function getComponentHelpers ({ layout, component } = {}) {
  if (!layout) { throw new Error('layout argument is missing') }
  if (!component) { throw new Error('component argument is missing') }

  return {
    getComponentUrl ({ params = null } = {}) {
      const parsedParams = params
        ? Object.entries(params).reduce(
          (parsed, [key, value]) => Object.assign(
            parsed,
            { [key]: value !== undefined ? value : '<undefined>' }
          ),
          {}
        )
        : params

      return `/heimdall-layouts/tests/suites/${layout}/${component}/views/?env=playwright&params=${encodeURIComponent(JSON.stringify(parsedParams))}`
    },

    getComponentAssetPath (asset) {
      if (!asset) { throw new Error('asset argument is missing') }
      return `/heimdall-layouts/tests/suites/${layout}/${component}/views/assets/${asset}`
    },

    getScreenshotPath (useCase, name = 'screenshot') {
      if (!useCase) { throw new Error('useCase argument is missing') }
      return [useCase, `${component}-${name}.png`]
    },

    tag: `hdl-${layout}-${component.replaceAll('_', '-')}`
      .replace(/-body$/, '')
  }
}
