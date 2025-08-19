import { createRequire } from 'module'
import postcss from 'postcss'
import inlineImports from 'postcss-import'
import cssUrl from 'postcss-url'
import { join, dirname, resolve } from 'path'
import logger from '@byfrost/utils/logger.js'
import { curry } from '@byfrost/utils/function.js'

const require = createRequire(import.meta.url)
const postcssConfigFilePath = resolve('./.postcssrc.cjs')
const { plugins: pluginsConfig } = require(postcssConfigFilePath)

const plugins = Object.entries(pluginsConfig)
  .map(([plugin, config]) => {
    const pluginPath = require.resolve(plugin, { paths: [dirname(postcssConfigFilePath)] })
    return require(pluginPath)(config)
  })

const log = logger.getLogger('utils/svelte_style_preprocessor')

export default curry(async function style ({ basePath = '', dest = '' }, { content: code, filename }) {
  log.debug({ basePath, filename })

  let css

  try {
    ({ css } = await postcss([
      inlineImports(),
      ...plugins,
      cssUrl({ url: asset => (dest ? dest + '/' : '') + asset.url })
    ]).process(code, { from: join(basePath, filename) }))
  } catch (error) {
    log.error(error)
    throw error
  }

  return { code: css }
})
