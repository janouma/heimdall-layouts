import shell from 'shelljs'
import { join, resolve as resolvePath, sep as slash } from 'path'
import createSimpleGit from 'simple-git'
import env from '../env.js'

const { enableSourceMap, origin } = env
const componentsDir = join('node_modules', '@heimdall/shared-lib', 'components')
const destinationDir = 'shared_components'

const components = shell.exec(`find ${componentsDir} -mindepth 1 -maxdepth 1 -type d`)
  .stdout.trim().split('\n')

for (const component of components) {
  const command = `utils-compile-svelte source=${component} destination=${destinationDir} \\
    sourceMap=${enableSourceMap} prefix=${origin}/shared_components`

  const compileResult = shell.exec(command)

  if (compileResult.code > 0) {
    throw new Error('failed to compile component ' + component)
  }

  console.info(compileResult.stdout)
}

if (process.env.NODE_ENV !== 'development') {
  stageBuiltFiles()
}

async function stageBuiltFiles () {
  try {
    const git = createSimpleGit()
    const status = await git.status()
    const newlyDeleted = status.deleted.filter(file => !status.staged.includes(file))

    const newFiles = Array.from(new Set([
      ...status.not_added,
      ...status.created,
      ...status.modified,
      ...status.renamed.map(({ to }) => to),
      ...newlyDeleted
    ]))
      .map(file => resolvePath(file))

    const destinationPath = resolvePath(destinationDir)

    for (const file of newFiles) {
      if (file.startsWith(destinationPath + slash)) {
        console.debug(`staging file "${file}"\n`)
        await git.add(file)
      }
    }

    console.info('✔ build complete')
  } catch (error) {
    console.error(error)
    console.info('x build failed')
    process.exit(1)
  }
}
