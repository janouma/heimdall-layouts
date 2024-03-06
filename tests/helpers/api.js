const responses = {}

export function mockApiResponse ({ url, payload, type = 'json' } = {}) {
  window.fetch = spyFetch
  responses[url] = { type, payload }
}

const nativeFetch = fetch

export function unmockApiResponse ({ url } = {}) {
  if (url) {
    delete responses[url]
  } else {
    window.fetch = nativeFetch
  }
}

function spyFetch (url, ...args) {
  const mockResponse = responses[url]

  if (mockResponse) {
    console.log('fetch intercepted:', { url, args })

    return Promise.resolve({
      ok: true,
      [mockResponse.type]: () => Promise.resolve(getPayload(mockResponse, url, ...args))
    })
  }

  return nativeFetch(url, ...args)
}

function getPayload ({ payload }, ...args) {
  return typeof payload === 'function' ? payload(...args) : payload
}

let nextRandomNumber
let mockRandomNumbers

export function mockMathRandom (...numbers) {
  nextRandomNumber = 0
  mockRandomNumbers = numbers
  Math.random = spyRandom
}

window.mockMathRandom = mockMathRandom

function spyRandom () {
  const number = mockRandomNumbers[nextRandomNumber]
  nextRandomNumber = (nextRandomNumber + 1) % mockRandomNumbers.length
  return number
}

const nativeSetTimeout = setTimeout
const nativeClearTimeout = clearTimeout
let timeouts = []
let timeoutsMocked

export function mockSetTimeout (mocked = true) {
  timeoutsMocked = mocked

  Object.assign(window, {
    setTimeout: spySetTimeout,
    clearTimeout: spyClearTimeout,
    mockEnlapsedTime,
    enableTimeoutsMock,
    disableTimeoutsMock
  })
}

function spySetTimeout (action, time) {
  let id

  if (timeoutsMocked) {
    id = 'timeout:' + String(Date.now()) + performance.now()
  } else {
    id = nativeSetTimeout(action, time)
  }

  timeouts.push({ id, time, action })
  return id
}

function mockEnlapsedTime (enlapsed) {
  if (timeoutsMocked) {
    const { actions, remaining } = timeouts.reduce((reduced, { id, time, action }) => {
      if (time <= enlapsed) {
        reduced.actions.push(action)
      } else {
        reduced.remaining.push({
          id,
          action,
          time: time - enlapsed
        })
      }

      return reduced
    }, { actions: [], remaining: [] })

    timeouts = remaining

    for (const action of actions) {
      try {
        action()
      } catch (error) {
        console.error(error)
      }
    }
  }
}

function spyClearTimeout (id) {
  if (timeoutsMocked) {
    timeouts = timeouts.filter(timeout => timeout.id !== id)
  } else {
    nativeClearTimeout(id)
  }
}

function enableTimeoutsMock () {
  timeoutsMocked = true

  for (const { id } of timeouts) {
    nativeClearTimeout(id)
  }
}

function disableTimeoutsMock () {
  timeoutsMocked = false
}

let frames = []

export function mockRequestAnimationFrame () {
  Object.assign(window, {
    requestAnimationFrame: spyRequestAnimationFrame,
    cancelAnimationFrame: spyCancelAnimationFrame,
    mockEnlapsedTimeFrame
  })
}

function mockEnlapsedTimeFrame (enlapsed) {
  const actions = frames
  frames = []

  for (const { action } of actions) {
    try {
      action(enlapsed)
    } catch (error) {
      console.error(error)
    }
  }
}

function spyRequestAnimationFrame (action) {
  const id = 'frame:' + String(Date.now()) + performance.now()
  frames.push({ id, action })
  return id
}

function spyCancelAnimationFrame (id) {
  frames = frames.filter(frame => frame.id !== id)
}
