'use strict'

const preprocessor = require('@heimdall/utils/lib/svelte_style_preprocessor')

module.exports = {
  preprocess: { style: preprocessor({ basePath: 'src' }) },
  compilerOptions: { customElement: true }
}
