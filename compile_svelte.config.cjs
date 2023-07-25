'use strict'

module.exports = {
  copyModules: true,

  modulesMapping: {
    svelte: {
      alias: 'svelte/internal/index.mjs',
      destination: './packages/svelte/internal/index.mjs'
    },

    '/^svelte/(.*)$/': {
      alias: 'svelte/$1/index.mjs',
      destination: './packages/svelte/$1/index.mjs'
    },

    joi: {
      alias: 'joi/dist/joi-browser.min.js',
      destination: './packages/joi-browser.min.js'
    },

    'fuse.js': {
      alias: 'fuse.js/dist/fuse.basic.esm.min.js',
      destination: './packages/fuse.js/dist/fuse.basic.esm.min.js'
    },

    'element-adapter': {
      alias: 'element-adapter/dist/element-adapter.esm.js',
      destination: './packages/element-adapter/dist/element-adapter.esm.js'
    },

    '/^@heimdall/utils/(.+)$/': {
      destination: './packages/@heimdall/utils/$1'
    },

    '/^\\^/lib/(.+)$/': {
      alias: './lib/$1',
      copyModule: false
    },

    '/^@heimdall/shared-lib/components/(.+)\\.svelte$/': {
      alias: './shared_components/$1.js',
      copyModule: false
    }
  }
}
