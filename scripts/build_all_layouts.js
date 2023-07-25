import shell from 'shelljs'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'

const layouts = readdirSync('src', { withFileTypes: true })
  .filter(
    entry =>
      entry.isDirectory() &&
      existsSync(join(entry.path), join(entry.name), 'components')
  )
  .map(({ name }) => name)

for (const layout of layouts) {
  const compileResult = shell.exec(`npm run build:layout -- name=${layout}`)

  if (compileResult.code > 0) {
    throw new Error('failed to compile layout ' + layout)
  }
}

console.info('successfully compiled all layouts:\n  • ' + layouts.join('  • \n'))
