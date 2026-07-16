let api

self.addEventListener('message', ({ data }) => {
  if (data.type === 'TMDB_API') { ({ payload: api } = data) }
})

self.addEventListener(
  'fetch',
  event => (api?.key ? reverseProxy : rewritePath)(event)
)

function reverseProxy (event) {
  const { origin, port, path, key } = api
  const url = new URL(event.request.url)
  const host = `${origin}:${port}`
  const apiUrl = host + path

  if (url.href.startsWith(apiUrl)) {
    const redirectUrl = url.href.replace(host, 'https://api.themoviedb.org')

    event.respondWith(fetch(
      redirectUrl,
      {
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + key
        }
      }
    ))
  }
}

function rewritePath (event) {
  const url = new URL(event.request.url)

  if (url.href.startsWith('https://image.tmdb.org/t/p/')) {
    const pathStartPosition = url.pathname.indexOf('/heimdall-layouts/')
    const redirectPath = url.pathname.slice(pathStartPosition)
    const redirectUrl = new URL(redirectPath, location.origin)
    event.respondWith(fetch(redirectUrl))
  }
}
