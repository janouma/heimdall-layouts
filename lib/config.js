export async function getConfig ({ layout, updates }) {
  const response = await fetch('/api/get-config/' + layout)
  let config = await response.json()

  if (config) {
    const initialVersion = config.version ?? 0

    for (let version = initialVersion; version < updates?.length; version++) {
      config = updates[version](config)
      config.version = version + 1
    }

    if (config.version > initialVersion) {
      await fetch('/api/set-config/' + layout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
    }

    return config
  }
}
