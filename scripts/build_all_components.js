import shell from 'shelljs'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'

const components = readdirSync('src', { withFileTypes: true })
  .filter(
    entry =>
      entry.isDirectory() &&
      existsSync(join(entry.parentPath, entry.name, 'components'))
  )
  .flatMap(
    ({ parentPath: layoutPath, name: layoutName }) =>
      readdirSync(join(layoutPath, layoutName, 'components'), { withFileTypes: true })
        .filter(({ name }) => !name.startsWith('.'))
        .map(({ name: componentName }) => `${layoutName}/${componentName}`)
  )

const args = process.argv.slice(2).join(' ')

for (const component of components) {
  const [layoutName, componentFolder] = component.split('/')
  const componentName = componentFolder.replace(new RegExp(`^hdl_${layoutName}_`), '')
  const compileResult = shell.exec(`npm run build:component -- name=${layoutName}/${componentName} ${args}`)

  if (compileResult.code > 0) {
    throw new Error('failed to compile component ' + component)
  }
}

console.info('successfully compiled all components:\n  • ' + components.join('\n  • '))
