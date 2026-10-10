import { test } from '@japa/runner'
import * as td from 'testdouble'

const nativeFetch = fetch
const TMDB_API_URL = 'https://themoviedb.trd-api.heimdallinsight.com:443/3'
const TMDB_WEB_URL = 'https://www.themoviedb.org'

const createOptionsMatcher = (expect, options) => actual => {
  try {
    expect(actual).toEqual(options)
    return true
  } catch {
    return false
  }
}

function mockConfiguration (
  matcher = td.matchers.anything(),
  once = false
) {
  const validPayoad = {
    ok: true,
    json: () => Promise.resolve({ images: { secure_base_url: 'https://images.tmdb.org/' } })
  }

  const resolveValues = once ? [validPayoad, undefined] : [validPayoad]
  return td.when(fetch(`${TMDB_API_URL}/configuration`, matcher)).thenResolve(...resolveValues)
}

let itemsSeekerApi

test.group('watch items seeker', group => {
  group.each.setup(async () => {
    Object.assign(globalThis, {
      window: globalThis,
      fetch: td.function('fetch')
    })

    itemsSeekerApi =
      await import(`../../../../layouts/watch/--/lib/items_seeker.js?t=${Date.now()}.${performance.now()}`)
  })

  group.each.teardown(() => {
    delete globalThis.window
    globalThis.fetch = nativeFetch
    td.reset()
  })

  test('#findItems movie search', async ({ expect }) => {
    const abortController = new AbortController()

    mockConfiguration(
      td.matchers.argThat(createOptionsMatcher(expect, { headers: { accept: 'application/json' } }))
    )

    const matchOptions = createOptionsMatcher(expect, {
      headers: { accept: 'application/json' },
      signal: abortController.signal
    })

    td.when(fetch(`${TMDB_API_URL}/search/movie?query=dune%20part%20two`, td.matchers.argThat(matchOptions)))
      .thenResolve({
        ok: true,

        json: () => Promise.resolve({
          total_results: 42,

          results: [{
            id: 693134,
            poster_path: 'dune.jpg',
            title: 'Dune: Part Two',
            original_title: 'Dune Part Two',
            overview: 'Paul Atreides unites with Chani and the Fremen.',
            vote_average: 8.4,
            release_date: '2024-02-27',
            runtime: 167,
            genres: [{ name: 'Science Fiction' }, { name: ' ' }],

            credits: {
              crew: [
                { job: 'Producer', name: 'Mary Parent' },
                { job: 'Director', name: 'Denis Villeneuve' }
              ],

              cast: [
                { name: 'Timothée Chalamet', character: 'Paul Atreides', profile_path: 'timothee.jpg' },
                { name: 'Zendaya', character: 'Chani', profile_path: null }
              ]
            }
          }]
        })
      })

    const { items, itemsCount } = await itemsSeekerApi.findItems(
      { query: 'dune part two', type: 'movie' },
      abortController
    )

    expect(itemsCount).toBe(42)

    expect(items).toEqual([{
      url: `${TMDB_WEB_URL}/movie/693134`,
      snapshot: 'https://images.tmdb.org/w500/dune.jpg',
      title: 'Dune: Part Two',

      meta: {
        externalId: 693134,
        originalTitle: 'Dune Part Two',
        overview: 'Paul Atreides unites with Chani and the Fremen.',
        score: 8.4,
        date: '2024-02-27',
        duration: 167,
        genres: ['Science Fiction'],
        directors: ['Denis Villeneuve'],

        cast: [
          { name: 'Timothée Chalamet', character: 'Paul Atreides', picture: 'https://images.tmdb.org/w185/timothee.jpg' },
          { name: 'Zendaya', character: 'Chani' }
        ]
      }
    }])
  })

  test('#findItems tv show search', async ({ expect }) => {
    mockConfiguration()

    td.when(fetch(`${TMDB_API_URL}/search/tv?query=fringe`, td.matchers.anything()))
      .thenResolve({
        ok: true,

        json: () => Promise.resolve({
          total_results: 1,

          results: [{
            id: 1396,
            poster_path: null,
            name: 'Fringe',
            original_name: 'Fringe',
            overview: '',
            vote_average: 8.4,
            first_air_date: '2008-09-09',
            last_air_date: '2008-09-10',
            genres: [],
            created_by: [{ name: 'J.J. Abrams' }, { name: 'Alex Kurtzman' }],
            number_of_seasons: 5,
            status: 'Ended'
          }]
        })
      })

    const { items, itemsCount } = await itemsSeekerApi.findItems({ query: 'fringe', type: 'tv show' })

    expect(itemsCount).toBe(1)

    expect(items).toEqual([{
      url: `${TMDB_WEB_URL}/tv/1396`,
      snapshot: null,
      title: 'Fringe',

      meta: {
        externalId: 1396,
        originalTitle: 'Fringe',
        score: 8.4,
        date: '2008-09-09',
        duration: 1440,
        directors: ['J.J. Abrams', 'Alex Kurtzman'],
        seasonsCount: 5,
        ended: true
      }
    }])
  })

  test('#findItems tv show search with invalid air dates', async ({ expect }) => {
    mockConfiguration()

    td.when(fetch(`${TMDB_API_URL}/search/tv?query=fringe`, td.matchers.anything()))
      .thenResolve({
        ok: true,

        json: () => Promise.resolve({
          total_results: 2,

          results: [
            {
              id: 1396,
              name: 'Fringe',
              first_air_date: '2008-09-09',
              last_air_date: 'unknown',
              status: 'Ended'
            },

            {
              id: 4087,
              name: 'Alias',
              first_air_date: 'unknown',
              last_air_date: '2006-05-22',
              status: 'Ended'
            }
          ]
        })
      })

    const { items } = await itemsSeekerApi.findItems({ query: 'fringe', type: 'tv show' })

    expect(items).toEqual([
      {
        url: `${TMDB_WEB_URL}/tv/1396`,
        title: 'Fringe',
        meta: { externalId: 1396, date: '2008-09-09', ended: true }
      },

      {
        url: `${TMDB_WEB_URL}/tv/4087`,
        title: 'Alias',
        meta: { externalId: 4087, ended: true }
      }
    ])
  })

  test('#findItems configuration caching', async () => {
    mockConfiguration(td.matchers.anything(), true)

    td.when(fetch(`${TMDB_API_URL}/search/movie?query=dune`, td.matchers.anything()))
      .thenResolve({
        ok: true,

        json: () => Promise.resolve({
          results: [],
          total_results: 0
        })
      })

    for (let i = 0; i < 2; i++) {
      await itemsSeekerApi.findItems({ query: 'dune', type: 'movie' })
    }
  })

  test('#findItems failure', async ({ expect }) => {
    mockConfiguration()

    td.when(fetch(`${TMDB_API_URL}/search/movie?query=dune`, td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsSeekerApi.findItems({ query: 'dune', type: 'movie' }))
      .rejects.toThrow(
        'cannot find any movie for these criteria ' + JSON.stringify({ query: 'dune', type: 'movie' })
      )
  })

  test('#findItems redirected response', async ({ expect }) => {
    mockConfiguration()

    td.when(fetch(`${TMDB_API_URL}/search/movie?query=dune`, td.matchers.anything()))
      .thenResolve({
        ok: false,
        redirected: true,
        json: () => Promise.resolve({ results: [{ id: 42, title: 'Dune' }], total_results: 1 })
      })

    const { items, itemsCount } = await itemsSeekerApi.findItems({ query: 'dune', type: 'movie' })

    expect(itemsCount).toBe(1)

    expect(items).toEqual([
      expect.objectContaining({
        url: `${TMDB_WEB_URL}/movie/42`,
        title: 'Dune'
      })
    ])
  })

  test('#lookup', async ({ expect }) => {
    mockConfiguration()

    const matchOptions = createOptionsMatcher(expect, { headers: { accept: 'application/json' } })

    td.when(fetch(`${TMDB_API_URL}/movie/dune%202?append_to_response=credits`, td.matchers.argThat(matchOptions)))
      .thenResolve({
        ok: true,

        json: () => Promise.resolve({
          id: 'dune 2',
          poster_path: 'dune.jpg',
          title: 'Dune: Part Two',
          vote_average: 8.4
        })
      })

    expect(await itemsSeekerApi.lookup({ id: 'dune 2', type: 'movie' })).toEqual({
      url: `${TMDB_WEB_URL}/movie/dune%202`,
      snapshot: 'https://images.tmdb.org/w500/dune.jpg',
      title: 'Dune: Part Two',

      meta: {
        externalId: 'dune 2',
        score: 8.4
      }
    })
  })

  test('#lookup failure', async ({ expect }) => {
    mockConfiguration()

    td.when(fetch(`${TMDB_API_URL}/movie/42?append_to_response=credits`, td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsSeekerApi.lookup({ id: 42, type: 'movie' }))
      .rejects.toThrow('cannot find movie for id 42')
  })

  test('#lookup redirected response', async ({ expect }) => {
    mockConfiguration()

    td.when(fetch(`${TMDB_API_URL}/movie/42?append_to_response=credits`, td.matchers.anything()))
      .thenResolve({
        ok: false,
        redirected: true,
        json: () => Promise.resolve({ id: 42, title: 'Dune' })
      })

    const item = await itemsSeekerApi.lookup({ id: 42, type: 'movie' })

    expect(item).toMatchObject({
      url: `${TMDB_WEB_URL}/movie/42`,
      title: 'Dune'
    })
  })

  test('configuration retrieval failure', async ({ expect }) => {
    td.when(fetch(`${TMDB_API_URL}/configuration`, td.matchers.anything()))
      .thenResolve({ ok: false, redirected: false })

    await expect(itemsSeekerApi.findItems({ query: 'dune', type: 'movie' }))
      .rejects.toThrow('cannot fetch tmdb configuration')
  })
})
