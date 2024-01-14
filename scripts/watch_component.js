import shell from 'shelljs'
import { join } from 'path'
import { existsSync } from 'fs'
import argsUtils from '@heimdall/utils/lib/args.js'

const args = argsUtils.argsArrayToArgsObject()

if (!args.name?.trim()) {
  throw new Error('"component" argument is missing')
}

if (!args.name.match(/^[\w_]+\/[\w_]+$/)) {
  throw new Error(`"component" path is not valid (expected layout/component, actual ${args.name})`)
}

const [layout, component] = args.name.split('/')
const layoutSource = join('src', layout)
const source = join(layoutSource, 'components', component)

if (!existsSync(source)) {
  throw new Error(`"${source}" component doesn't exist`)
}

const remainingArgs = Object.entries(args)
  .filter(([name]) => name !== 'name')
  .reduce((commanLineArgs, [name, value]) => `${commanLineArgs} ${name}=${value}`, '')
  .trim()

const watchCommand = `nodemon -e js,svelte,png,svg,jpg,json --delay 0.5 --watch ${layoutSource} --exec "npm run build:component -- name=${layout}/${component} ${remainingArgs}"`

console.debug('watch command:', watchCommand)

const watch = shell.exec(watchCommand)

if (watch.code > 0) {
  throw new Error('failed to watch component ' + args.name)
} else {
  console.info('successfully watched component ' + args.name)
}
