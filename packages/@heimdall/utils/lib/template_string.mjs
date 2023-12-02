export function render (str, locals) {
  return compile(str).call(this, locals)
}

export function compile (str) {
  const es6TemplateRegex = /(\\)?\$\{([^{}\\]+)\}/g

  if (typeof str !== 'string') {
    throw new Error('The argument must be a string type')
  }

  return function (locals) {
    return str.replace(es6TemplateRegex, function (matched) {
      return parse(matched).call(locals || {})
    })
  }
}

const { hasOwnProperty } = Object.prototype

function parse (variable) {
  const exp = variable.match(/\{(.*)\}/)[1]

  if (variable[0] === '\\') {
    return function () {
      return variable.slice(1)
    }
  }

  return function () {
    let declare = ''

    for (const key in this) {
      if (hasOwnProperty.call(this, key)) {
        declare += `const ${key} = locals.${key};`
      }
    }

    /* eslint-disable-next-line no-new-func */
    return new Function('locals', declare + 'return ' + exp)(this)
  }
}
