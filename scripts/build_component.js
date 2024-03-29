import shell from 'shelljs'
import { join } from 'path'
import { existsSync } from 'fs'
import argsUtils from '@heimdall/utils/lib/args.js'
import env from '../env.js'

const { enableSourceMap, origin } = env
const args = argsUtils.argsArrayToArgsObject()

if (!args.name?.trim()) {
  throw new Error('"component" argument is missing')
}

if (!args.name.match(/^[\w_]+\/[\w_]+$/)) {
  throw new Error(`"component" path is not valid (expected layout/component, actual ${args.name})`)
}

const [layout, component] = args.name.split('/')
const source = join('src', layout, 'components', component)

if (!existsSync(source)) {
  throw new Error(`"${source}" component doesn't exist`)
}

const destination = join('layouts', layout)
const componentDestinationPath = join(destination, component)

shell.mkdir('-p', componentDestinationPath)

const compileResult = shell.exec(
  `utils-compile-svelte source="${source}" destination="${destination}" sourceMap=${enableSourceMap} \\
    prefix=${origin}/${destination}`
)

if (compileResult.code > 0) {
  throw new Error('failed to compile component ' + args.name)
} else {
  console.info('successfully compiled component ' + args.name)
}
