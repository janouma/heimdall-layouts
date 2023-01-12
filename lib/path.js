export function createResolver (url) {
  if (!url) {
    throw new Error('url argument is missing')
  }

  const baseUrl = url.slice(0, url.lastIndexOf('/'))

  return function resolve (relativePath) {
    if (!relativePath) {
      throw new Error('relativePath argument is missing')
    }

    return `${baseUrl}/${relativePath}`
  }
}
