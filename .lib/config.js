export async function getConfig ({ layout, updates }) {
  const NO_CONTENT = 204
  const response = await fetch('/api/get-config/' + layout)

  if (!response.ok && !response.redirected) {
    throw new Error('cannot get config for layout ' + layout)
  }

  let config = response.status !== NO_CONTENT && await response.json()

  if (config) {
    const initialVersion = config.version ?? 0

    for (let version = initialVersion; version < updates?.length; version++) {
      config = updates[version](config)
      config.version = version + 1
    }

    if (config.version > initialVersion) { await setConfig(layout, config) }

    return config
  }
}

export async function setConfig (layout, config) {
  const response = await fetch('/api/set-config/' + layout, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })

  if (!response.ok && !response.redirected) {
    throw new Error(`cannot update config for layout ${layout} with payload:\n${JSON.stringify(config)}`)
  }
}
