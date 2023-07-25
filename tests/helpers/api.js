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

export function mockSetTimeout () {
  Object.assign(window, {
    setTimeout: spySetTimeout,
    clearTimeout: spyClearTimeout
  })

  window.mockEnlapsedTime = mockEnlapsedTime
}

export function mockMathRandom (...numbers) {
  nextRandomNumber = 0
  mockRandomNumbers = numbers
  Math.random = spyRandom
}

const responses = {}

let timeouts = []
let nextRandomNumber
let mockRandomNumbers

function spyFetch (url, ...args) {
  const mockResponse = responses[url]

  return mockResponse
    ? Promise.resolve({
      ok: true,
      [mockResponse.type]: () => Promise.resolve(getPayload(mockResponse, url, ...args))
    })
    : nativeFetch(url, ...args)
}

function getPayload ({ payload }, ...args) {
  return typeof payload === 'function' ? payload(...args) : payload
}

function spySetTimeout (action, time) {
  const id = String(Date.now()) + performance.now()
  timeouts.push({ id, time, action })
  return id
}

function mockEnlapsedTime (enlapsed) {
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
      console.error(error.toString())
    }
  }
}

function spyClearTimeout (id) {
  timeouts = timeouts.filter(timeout => timeout.id !== id)
}

function spyRandom () {
  const number = mockRandomNumbers[nextRandomNumber]
  nextRandomNumber = (nextRandomNumber + 1) % mockRandomNumbers.length
  return number
}
