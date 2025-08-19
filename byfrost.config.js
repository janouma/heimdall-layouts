import stylePreprocessor from './svelte_style_preprocessor.js'

export default {
  stylePreprocessor,
  copyModules: true,

  modulesMapping: {
    vue: {
      alias: 'vue/dist/vue.runtime.esm-browser.prod.js',
      destination: './packages/vue.js'
    },

    svelte: {
      alias: 'svelte/internal',
      destination: './packages/svelte/internal/index.js'
    },

    '/^svelte/(.*)$/': { destination: './packages/svelte/$1/index.js' },

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

    '/^@byfrost/utils/(.+)$/': {
      destination: './packages/@byfrost/utils/$1'
    },

    '/^lib/(.+)$/': {
      alias: './lib/$1',
      copyModule: false
    },

    '/^@heimdall/shared-lib/components/(.+)\\.svelte$/': {
      alias: './shared_components/$1.js',
      copyModule: false
    }
  }
}
