export async function findItems (search, abortController) {
  const response = await fetch('/api/find-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(search),
    signal: abortController?.signal
  })

  if (!response.ok && !response.redirected) {
    throw new Error('cannot find items for these criteria ' + JSON.stringify(search))
  }

  return response.json()
}

export async function countItems (search, abortController) {
  const response = await fetch('/api/count-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(search),
    signal: abortController?.signal
  })

  if (!response.ok && !response.redirected) {
    throw new Error('cannot count items for these criteria ' + JSON.stringify(search))
  }

  return response.json()
}

export async function lookup ({ ids, abortController }) {
  const response = await fetch('/api/lookup-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids),
    signal: abortController?.signal
  })

  if (!response.ok && !response.redirected) {
    throw new Error('cannot find items with ids ' + ids)
  }

  return response.json()
}

export async function save (item) {
  const response = await fetch('/api/save-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  })

  if (!response.ok && !response.redirected) {
    throw new Error('cannot save item ' + JSON.stringify(item))
  }

  return response.json()
}

export async function remove (id) {
  const response = await fetch('/api/remove-item/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok && !response.redirected) {
    throw new Error('cannot remove item ' + id)
  }
}
