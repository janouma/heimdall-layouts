'use strict'

module.exports = {
  copyModules: true,

  modulesMapping: {
    svelte: 'svelte/internal/index.mjs',
    'svelte/internal': 'svelte/internal/index.mjs',
    'svelte/easing': 'svelte/easing/index.mjs',
    'svelte/transition': 'svelte/transition/index.mjs'
  }
}
