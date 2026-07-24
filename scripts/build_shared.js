import shell from 'shelljs'
import { join } from 'path'
import { existsSync } from 'fs'
import env from '../env.js'

const { enableSourceMap, origin, logLevel = 'info' } = env
const componentsDir = join('node_modules', '@heimdall/shared-lib', 'components')
const destinationDir = 'shared_components'

if (existsSync(destinationDir)) {
  shell.rm('-rf', destinationDir)
}

const components = shell.exec(`find ${componentsDir} -mindepth 1 -maxdepth 1 -type d`)
  .stdout.trim().split('\n')

for (const component of components) {
  const command = `LOG_LEVEL=${logLevel} npx @byfrost/core compile source=${component} destination=${destinationDir} \\
    sourceMap=${enableSourceMap} prefix=${origin}/shared_components`

  const compileResult = shell.exec(command)

  if (compileResult.code > 0) {
    throw new Error('failed to compile component ' + component)
  }

  console.info(compileResult.stdout)
}

console.info('✔ build complete')
