export function applyParameters (element, defaults) {
  const serializedParams = (new URL(document.location.href)).searchParams.get('params')
  const parameters = JSON.parse(serializedParams)

  const parsedParameters = parameters
    ? Object.entries(parameters).reduce(
      (parsed, [key, value]) => Object.assign(
        parsed,
        { [key]: value !== '<undefined>' ? value : undefined }
      ),
      {}
    )
    : parameters

  console.debug('parameters:', parsedParameters)

  Object.assign(element, defaults, parsedParameters)
}
