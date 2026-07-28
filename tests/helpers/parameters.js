export function applyParameters (element, defaults, parsedParameters) {
  const parameters = parsedParameters ?? getParameters()
  console.debug('parsed parameters:', parameters)
  Object.assign(element, defaults, parameters)
}

export function getParameters () {
  const serializedParams = (new URL(document.location.href)).searchParams.get('params')
  const parameters = JSON.parse(serializedParams)

  console.debug('raw parameters:', parameters)

  return parameters
    ? Object.entries(parameters).reduce(
      (parsed, [key, value]) => Object.assign(
        parsed,
        { [key]: value !== '<undefined>' ? value : undefined }
      ),
      {}
    )
    : parameters
}
