import { test } from '@japa/runner'

const nativeConsole = console
const noop = () => {}
const mockConsole = {}

for (const property in nativeConsole) {
  if (typeof nativeConsole[property] === 'function') {
    mockConsole[property] = noop
  }
}

let setLayoutState
let getLayoutState
let layoutSubscribe
let getPlaylists

test.group('watch layout services', group => {
  group.each.setup(async () => {
    Object.assign(globalThis, {
      window: globalThis,
      console: mockConsole
    })

    const { default: juris } = await import('../../../../.lib/juris/instance.js')
    await import(`../../../../layouts/watch/--/lib/services.js?t=${Date.now()}.${performance.now()}`);

    ({ setLayoutState, getLayoutState, layoutSubscribe, getPlaylists } = juris.services.HdlWatch)
  })

  group.each.teardown(() => {
    delete globalThis.window
    globalThis.console = nativeConsole
  })

  test('set and get layout state with a string key', ({ expect }) => {
    setLayoutState('title', 'dune')
    expect(getLayoutState('title')).toBe('dune')

    setLayoutState('search.text', 'tron')
    expect(getLayoutState('search.text')).toBe('tron')
  })

  test('get layout state default value', ({ expect }) => {
    expect(getLayoutState('unknown.key', 'fallback')).toBe('fallback')

    setLayoutState('unknown.key', 'known')
    expect(getLayoutState('unknown.key', 'fallback')).toBe('known')
  })

  test('get whole layout state', ({ expect }) => {
    setLayoutState('itemType', 'movie')
    setLayoutState('search.text', 'dune')

    expect(getLayoutState()).toEqual({
      itemType: 'movie',
      search: { text: 'dune' }
    })
  })

  test('set layout state with an object key', ({ expect }) => {
    setLayoutState({
      search: {
        text: 'dune',
        connectees: ['user-audie']
      },

      itemsCount: 3
    })

    expect(getLayoutState('search.text')).toBe('dune')
    expect(getLayoutState('search.connectees')).toEqual(['user-audie'])
    expect(getLayoutState('itemsCount')).toBe(3)

    setLayoutState({ search: { text: 'tron' } })

    expect(getLayoutState('search')).toEqual({
      text: 'tron',
      connectees: ['user-audie']
    })
  })

  test('layout state subscription', ({ expect }) => {
    const received = []
    const unsubscribe = layoutSubscribe('watched.key', value => received.push(value))

    setLayoutState('watched.key', 'first')
    expect(received).toEqual(['first'])

    setLayoutState({ watched: { key: 'second' } })
    expect(received).toEqual(['first', 'second'])

    unsubscribe()

    setLayoutState('watched.key', 'third')
    expect(received).toEqual(['first', 'second'])
  })

  test('playlists retrieval', ({ expect }) => {
    setLayoutState('itemType', 'movie')

    setLayoutState('config.playlists', {
      favorites: {
        movie: ['Spider-Man Brand New Day'],
        'tv show': ['Fringe']
      },

      'sci-fi': { movie: ['Odyssey'] },
      series: { 'tv show': ['Blindspot'] },
      empty: { movie: [] },
      cleared: null,
      'partially cleared': { movie: null, 'tv show': 'Silo' }
    })

    expect(getPlaylists()).toEqual(['favorites', 'sci-fi'])

    setLayoutState('itemType', 'tv show')
    expect(getPlaylists()).toEqual(['favorites', 'series', 'partially cleared'])
  })

  test('playlists retrieval without config', ({ expect }) => {
    setLayoutState('itemType', 'movie')
    expect(getPlaylists()).toEqual([])
  })
})
