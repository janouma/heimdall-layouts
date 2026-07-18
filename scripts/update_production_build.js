import shell from 'shelljs'
import createSimpleGit from 'simple-git'
import { resolve as resolvePath, sep as slash, join } from 'path'

build()

async function build () {
  try {
    const git = createSimpleGit()
    const allLayouts = shell.ls('src').stdout.trim().split('\n')
    const layouts = await getTracked({ git, dirs: allLayouts, parent: 'src' })

    process.stdout.write(`\nlayouts:\n  ${layouts.join('\n  ')}\n`)

    for (const layout of layouts) {
      shell.exec(`npm run build:layout -- name=${layout}`)
    }

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

    const builtDirs = ['layouts', '.lib', 'packages', 'shared_components']
      .map(dir => resolvePath(dir))

    for (const file of newFiles) {
      if (builtDirs.some(dir => file.startsWith(dir + slash))) {
        process.stdout.write(`staging file "${file}"\n`)
        await git.add(file)
      }
    }

    const layoutsDescriptor = resolvePath('layouts.json')

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

async function getTracked ({ git, dirs, parent }) {
  const filtered = dirs.map(async dir => {
    const result = await git.raw(['ls-files', join(parent, dir)])
    return result.trim().length > 0 && dir
  })

  return (await Promise.all(filtered)).filter(dir => Boolean(dir))
}
