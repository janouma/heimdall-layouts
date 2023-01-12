const layoutFolderPattern = /^([a-z0-9]+)(_[a-z0-9]+)*$/

async function init () {
  const response = await fetch('layouts.json')
  const layouts = await response.json()

  const verifiedLayouts = (await Promise.allSettled(layouts.map(verifyLayout)))
    .filter(canLoadLayout)
    .map(({ value }) => value)

  const layoutsList = document.querySelector('.layouts')

  for (const layout of verifiedLayouts) {
    const item = document.createElement('li')
    const anchor = document.createElement('a')
    const layoutFolder = getFolder(layout)

    anchor.textContent = layout?.name ?? layoutFolder
    anchor.setAttribute('href', `tests/suites/${layoutFolder}/main/views`)
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('style', `--icon: url(layouts/${getFolder(layout)}/assets/images/icon.svg);`)

    item.appendChild(anchor)
    layoutsList.appendChild(item)
  }
}

async function verifyLayout (layout) {
  const folder = getFolder(layout)

  if (!folder.match(layoutFolderPattern)) {
    throw new Error(folder + " doesn't match " + layoutFolderPattern)
  }

  const layoutPath = 'layouts/' + folder

  const responses = await Promise.all([
    fetch(layoutPath + '/assets/images/icon.svg', { method: 'HEAD' }),
    fetch(layoutPath + '/index.js', { method: 'HEAD' })
  ])

  if (responses.every(response => response.ok)) {
    return layout
  }

  throw new Error(responses.filter(response => !response.ok).map(response => 'failed to load resource ' + response.url))
}

function canLoadLayout ({ status, reason }) {
  if (reason) { console.error(reason) }
  return status === 'fulfilled'
}

function getFolder (layout) {
  return layout.folder ?? layout
}

init()
