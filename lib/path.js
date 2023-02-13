export function createResolver (url) {
  if (!url) {
    throw new Error('url argument is missing')
  }

  const baseUrl = url.slice(0, url.lastIndexOf('/'))

  return function resolve (relativePath) {
    if (!relativePath) {
      throw new Error('relativePath argument is missing')
    }

    return normalize(`${baseUrl}/${relativePath}`)
  }
}

function normalize (url) {
  const [, protocol, path] = url.match(/^(https?:\/\/)?(.+)$/)

  const pathSegments = path
    .replaceAll('/./', '/')
    .replace('/./', '/')
    .replaceAll(/\/+/g, '/')
    .split('/')
    .reduce(
      (segments, segment, index) =>
        index > 0 && segment === '..' && segments.at(-1) !== '..'
          ? segments.slice(0, -1)
          : segments.concat(segment),
      []
    )

  return protocol + pathSegments.join('/')
}
