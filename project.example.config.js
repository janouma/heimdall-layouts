export default {
  port: 3006, // can be omitted for production
  prefix: 'heimdall-layouts', // should be present only for production
  baseUrl: 'https://janouma.github.io',
  logLevel: 'info',

  tmdbApi: {
    origin: 'https://themoviedb.trd-api.heimdallinsight.com',
    path: '/3',
    key: 'TMDB_API_KEY',
    port: 443
  }
}
