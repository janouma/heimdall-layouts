import shell from 'shelljs'
import { join } from 'path'
import { existsSync } from 'fs'
import { argsArrayToArgsObject } from '@byfrost/utils/args.js'

const args = argsArrayToArgsObject()

if (!args.name?.trim()) {
  throw new Error('"component" argument is missing')
}

if (!args.name.match(/^[\w_]+(\/[\w_]+)?$/)) {
  throw new Error(`"component" path is not valid (expected layout/component, actual ${args.name})`)
}

const targetType = args.name.includes('/') ? 'component' : 'layout'

let layoutSource
let source
let targetName

if (targetType === 'component') {
  const [layout, componentName] = args.name.split('/')
  const component = componentName && `hdl_${layout}_${componentName}`
  layoutSource = join('src', layout)
  source = join(layoutSource, 'components', component)
  targetName = `${layout}/${componentName}`
} else {
  targetName = args.name
  layoutSource = join('src', targetName)
  source = layoutSource
}

if (!existsSync(source)) {
  throw new Error(`"${source}" ${targetType} doesn't exist`)
}

const remainingArgs = Object.entries(args)
  .filter(([name]) => name !== 'name')
  .reduce((commanLineArgs, [name, value]) => `${commanLineArgs} ${name}=${value}`, '')
  .trim()

const watchCommand = `nodemon -e js,svelte,esm,png,svg,jpg,json,css --delay 0.5 --watch ${layoutSource} --exec "npm run build:${targetType} -- name=${targetName} useDevPort ${remainingArgs}"`

console.debug('watch command:', watchCommand)

const watch = shell.exec(watchCommand)

if (watch.code > 0) {
  throw new Error('failed to watch component ' + args.name)
} else {
  console.info('successfully watched component ' + args.name)
}
