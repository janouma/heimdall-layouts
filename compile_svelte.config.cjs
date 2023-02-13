'use strict'

const { readdirSync } = require('fs')

const libs = readdirSync('lib', { withFileTypes: true })
  .filter(file => file.isFile() && file.name.endsWith('.js'))
  .map(({ name }) => name)

module.exports = {
  copyModules: true,

  modulesMapping: {
    svelte: {
      alias: 'svelte/internal/index.mjs',
      destination: '../../packages/svelte/internal/index.mjs'
    },

    'svelte/internal': {
      alias: 'svelte/internal/index.mjs',
      destination: '../../packages/svelte/internal/index.mjs'
    },

    'svelte/easing': {
      alias: 'svelte/easing/index.mjs',
      destination: '../../packages/svelte/easing/index.mjs'
    },

    'svelte/transition': {
      alias: 'svelte/transition/index.mjs',
      destination: '../../packages/svelte/transition/index.mjs'
    },

    joi: {
      alias: 'joi/dist/joi-browser.min.js',
      destination: '../../packages/joi-browser.min.js'
    },

    ...libs.reduce((merged, lib) => Object.assign(merged, {
      ['^/lib/' + lib]: {
        alias: '../../lib/' + lib,
        copyModule: false
      }
    }), {})
  }
}
