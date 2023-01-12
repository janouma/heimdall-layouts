'use strict'

module.exports = {
  plugins: {
    'postcss-import': {},

    'postcss-mixins': {
      silent: true,
      mixinsDir: "node_modules/@heimdall/shared-lib/style/mixins"
    },

    'postcss-preset-env': {
      stage: 0,

      features: {
        calc: false
      },

      importFrom: [{
        environmentVariables: {
          '--nano-screen': '350px',
          // '--mini-screen': '812px',
          '--small-screen': '1024px'
        }
      }]
    }
  }
}
