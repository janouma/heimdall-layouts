export function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const nullish = [null, undefined]

export function createOffsettedSplice () {
  let offset = 0

  return function splice (string, replacement, start, end) {
    if (nullish.includes(string)) {
      throw new Error('string argument is required')
    }

    if (nullish.includes(replacement)) {
      throw new Error('replacement argument is required')
    }

    if (end < start) {
      throw new Error('end must be greater or equal to start')
    }

    const from = start + offset
    const to = end + offset
    offset += replacement.length - (end - start)
    return string.slice(0, from) + replacement + string.slice(to)
  }
}
