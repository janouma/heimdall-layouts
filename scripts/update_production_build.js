import shell from 'shelljs'
import createSimpleGit from 'simple-git'

import {
  join,
  resolve as resolvePath,
  sep as slash
} from 'path'

build()

async function build () {
  try {
    const sources = process.argv.slice(2).map(source => resolvePath(source))
    const sourceDir = resolvePath('src')
    const layoutsFiles = sources.filter(source => source.startsWith(sourceDir + slash))
    const layoutDirMatcher = new RegExp(`^${sourceDir}${slash}(.+?)${slash}.*$`)
    const layouts = dedup(layoutsFiles.map(file => file.replace(layoutDirMatcher, '$1')))

    process.stdout.write(`sources:\n  ${sources.join('\n  ')}\n`)
    process.stdout.write(`\nlayouts:\n  ${layouts.join('\n  ')}\n`)

    for (const layout of layouts) {
      shell.exec(`npm run build:layout -- name=${layout}`)
    }

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

    const destinationDir = resolvePath('layouts')

    for (const layout of layouts) {
      for (const file of newFiles) {
        if (file.startsWith(join(destinationDir, layout) + slash)) {
          process.stdout.write(`staging file "${file}"\n`)
          await git.add(file)
        }
      }
    }

    const layoutsDescriptor = join(destinationDir, 'layouts.json')

    if (newFiles.includes(layoutsDescriptor)) {
      process.stdout.write(`staging file "${layoutsDescriptor}"\n`)
      await git.add(layoutsDescriptor)
    }

    process.stdout.write('✔ build complete\n')
  } catch (error) {
    process.stderr.write(error.stack + '\n')
    process.stdout.write('x build failed\n')
    process.exit(1)
  }
}

function dedup (list) {
  return Array.from(new Set(list))
}
