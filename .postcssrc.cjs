'use strict'

module.exports = {
  plugins: {
    'postcss-import': {},

    'postcss-preset-env': {
      stage: 0,

      features: {
        calc: false
      },

      importFrom: [{
        environmentVariables: {
          '--nano-screen': '350px',
          '--small-screen': '1024px'
        }
      }]
    }
  }
}
