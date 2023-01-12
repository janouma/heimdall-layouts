export function createValidator (path) {
  if (!document.documentElement.classList.contains('development')) {
    return idle
  } else {
    if (!path) {
      throw new Error('"path" argument is missing')
    }

    if (!path.match(pathPattern)) {
      throw new Error(`"path" is not valid (expected layout/component, actual ${path})`)
    }

    const [layout, component] = path.split('/')

    return function validate (value, propName, schema) {
      if (!propName) {
        throw new Error('"propName" argument is missing')
      }

      if (!schema) {
        throw new Error('"schema" argument is missing')
      }

      const { error } = schema
        .label(`hdl-${layout}-${component}/${propName}`)
        .validate(value, { convert: false })

      if (error) {
        console.error(error.message)
      }
    }
  }
}

const pathPattern = /^[\w_]+\/[\w_]+$/

function idle () {}
