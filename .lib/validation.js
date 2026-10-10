import { isDevelopment } from './environment.js'

export function createValidator (path) {
  if (!isDevelopment) {
    return idle
  } else {
    if (!path) {
      throw new Error('"path" argument is missing')
    }

    if (!path.match(pathPattern)) {
      throw new Error(`"path" is not valid (expected layout/component, actual ${path})`)
    }

    const [, component] = path.split('/')

    return function validate (value, propName, schema) {
      if (!propName) {
        throw new Error('"propName" argument is missing')
      }

      if (!schema) {
        throw new Error('"schema" argument is missing')
      }

      const { error } = schema.validate(value, { convert: false })

      if (error) {
        console.error(`${component}/${propName}: ${error.message}`)
      }
    }
  }
}

const pathPattern = /^[\w_]+\/[\w_]+$/

function idle () {}
