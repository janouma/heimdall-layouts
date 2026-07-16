export const searchModes = {
  ADD: 'add',
  FIND: 'find'
}

export const itemTypes = {
  MOVIE: 'movie',
  TV_SHOW: 'tv show'
}

export const defaultSearch = Object.freeze({
  offset: 0,
  max: 200,
  tags: Object.freeze([]),
  connectees: Object.freeze([]),
  text: '',
  workspace: '',
  includeDraft: true
})

export const WATCH_TAG = 'to watch'
export const DEFAULT_PLAYLIST = 'watch sequence'
export const WATCHED_WKSP = 'watched'
export const WATCHING_WKSP = 'watching'
