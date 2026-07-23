import logger from '../../../../packages/@byfrost/utils/logger.js'
import dateUtil from './date.js'
import { itemTypes } from './constants.js'

const log = logger.getLogger('layout/watch/lib/items_seeker')

const typesMappping = {
  [itemTypes.TV_SHOW]: 'tv',
  [itemTypes.MOVIE]: 'movie'
}

const TMDB_API_URL = 'https://themoviedb.trd-api.heimdallinsight.com:443/3'
const TMDB_WEB_URL = 'https://www.themoviedb.org'

let configuration

export async function findItems ({ query, type }, abortController) {
  const { images: { secure_base_url: imagesBaseUrl } } = await getConfig()
  const mappedType = typesMappping[type]

  const response = await fetch(
    `${TMDB_API_URL}/search/${mappedType}?query=${encodeURIComponent(query)}`,

    {
      headers: { accept: 'application/json' },
      signal: abortController?.signal
    }
  )

  if (!response.ok && !response.redirected) {
    throw new Error(`cannot find any ${type} for these criteria ${JSON.stringify({ query, type })}`)
  }

  const { results, total_results: itemsCount } = await response.json()
  const items = results.map(source => convertToItem({ source, mappedType, imagesBaseUrl }))

  return { items, itemsCount }
}

export async function lookup ({ id, type }) {
  const { images: { secure_base_url: imagesBaseUrl } } = await getConfig()
  const mappedType = typesMappping[type]

  const response = await fetch(
    `${TMDB_API_URL}/${mappedType}/${encodeURIComponent(id)}?append_to_response=credits`,
    { headers: { accept: 'application/json' } }
  )

  if (!response.ok && !response.redirected) {
    throw new Error(`cannot find ${type} for id ${id}`)
  }

  const source = await response.json()
  return convertToItem({ source, mappedType, imagesBaseUrl })
}

async function getConfig () {
  if (configuration) { return configuration }

  const response = await fetch(
    TMDB_API_URL + '/configuration',
    { headers: { accept: 'application/json' } }
  )

  if (!response.ok && !response.redirected) {
    throw new Error('cannot fetch tmdb configuration')
  }

  configuration = await response.json()
  return configuration
}

function convertToItem ({
  source: {
    id: externalId,
    poster_path: snapshot,
    title,
    original_title: originalTitle,
    name: tvName,
    original_name: originalName,
    overview,
    vote_average: score,
    release_date: releaseDate,
    first_air_date: tvReleaseDate,
    last_air_date: tvLastAirDate,
    runtime,
    genres,
    credits,
    number_of_seasons: seasonsCount,
    status,
    created_by: creators
  },
  mappedType,
  imagesBaseUrl
}) {
  const filteredGenres = genres?.map(genre => genre.name).filter(name => name.trim())

  let duration = runtime

  if (!duration && tvReleaseDate && tvLastAirDate) {
    try {
      duration = dateUtil(tvLastAirDate).diff(dateUtil(tvReleaseDate), 'minutes')
    } catch (error) {
      log.error('unable to compute duration from data', { tvLastAirDate, tvReleaseDate })
    }
  }

  let directors

  if (mappedType === 'tv') {
    directors = creators?.length > 0 ? creators.map(creator => creator.name) : undefined
  } else {
    const director = credits?.crew?.find(
      person => person.job?.toLowerCase() === 'director'
    )?.name

    directors = director && [director]
  }

  return {
    url: `${TMDB_WEB_URL}/${mappedType}/${externalId}`,
    snapshot: snapshot && `${imagesBaseUrl}w500/${snapshot}`,
    title: title || tvName,

    meta: stripUsetValues({
      externalId,
      originalTitle: originalTitle || originalName,
      // overview can be blank
      overview: overview || undefined,
      score,
      // date can be blank
      date: releaseDate || tvReleaseDate || undefined,
      duration,
      genres: filteredGenres?.length > 0 ? filteredGenres : undefined,
      directors,

      cast: credits?.cast?.map(({ name, character, profile_path: profile }) => stripUsetValues({
        name,
        character,
        picture: profile && `${imagesBaseUrl}w185/${profile}`
      })),

      ...(mappedType === 'tv' && {
        seasonsCount,
        ended: status?.toLowerCase() === 'ended'
      })
    })
  }
}

const stripUsetValues = obj => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value != null)
)
