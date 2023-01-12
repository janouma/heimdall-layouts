import shell from 'shelljs'
import { join } from 'path'
import { existsSync } from 'fs'
import argsUtils from '@heimdall/utils/args'

const args = argsUtils.argsArrayToArgsObject()

if (!args.component?.trim()) {
  throw new Error('"component" argument is missing')
}

if (!args.component.match(/^[\w_]+\/[\w_]+$/)) {
  throw new Error(`"component" path is not valid (expected layout/component, actual ${args.component})`)
}

const [layout, component] = args.component.split('/')
const source = join('src', layout, 'components', component)

if (!existsSync(source)) {
  throw new Error(`"${source}" component doesn't exist`)
}
const watchCommand = `nodemon -e js,svelte,png,svg,jpg,json --delay 0.5 --watch ${source} --exec "npm run build:component -- component=${layout}/${component}"`

console.debug('watch command:', watchCommand)

const watch = shell.exec(watchCommand)

if (watch.code > 0) {
  throw new Error('failed to watch component ' + args.component)
} else {
  console.info('successfully watched component ' + args.component)
}
