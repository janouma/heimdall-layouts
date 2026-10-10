import shell from 'shelljs'
import { join, dirname } from 'path'

import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync
} from 'fs'

import { argsArrayToArgsObject } from '@byfrost/utils/args.js'

const args = argsArrayToArgsObject()
const layoutName = args.name?.trim()

if (!layoutName) {
  throw new Error('"layout" argument is missing')
}

const testMainViewPath = join('tests', 'suites', layoutName, 'main', 'views', 'index.html')
if (!existsSync(testMainViewPath)) {
  throw new Error(`test view ${testMainViewPath} is missing`)
}

const mainLayoutsDescriptor = JSON.parse(readFileSync('layouts.json'))
const source = join('src', layoutName)

if (!existsSync(source)) {
  throw new Error(`"${source}" layout doesn't exist`)
}

const destination = join('layouts', layoutName)

if (existsSync(destination)) {
  shell.rm('-rf', destination)
}

shell.mkdir(destination)

const statics = shell.find(join(source, '*'))
  .filter(
    file => !file.match(/\/components\/?|\.DS_Store|.*\.afdesign\b/) &&
      file.match(/\/assets\/|layout\.json\b/) && statSync(file).isFile()
  )

console.debug('statics:', statics)

for (const staticFile of statics) {
  const relativeStatic = staticFile.replace(source, '')
  const destinationFile = join(destination, relativeStatic)
  shell.mkdir('-p', dirname(destinationFile))
  shell.cp(staticFile, destinationFile)
}

const componentsDir = join(source, 'components')

const components = readdirSync(componentsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.match(/\w_(body|header)$/))
  .map(({ name }) => name)

console.debug('components:', components)

const indexStatements = []

const remainingArgs = Object.entries(args)
  .filter(([name]) => name !== 'name')
  .reduce((commanLineArgs, [name, value]) => `${commanLineArgs} ${name}=${value}`, '')
  .trim()

for (const component of components) {
  const componentName = component.replace(new RegExp(`^hdl_${layoutName}_`), '')
  const compileResult = shell.exec(`npm run build:component -- name=${layoutName}/${componentName} ${remainingArgs}`)

  if (compileResult.code > 0) {
    throw new Error('failed to compile component ' + component)
  } else {
    indexStatements.push(`import './${component}/index.js'`)
  }
}

writeFileSync(join(destination, 'index.js'), indexStatements.join('\n') + '\n')

const layoutDescriptorPath = join(source, 'layout.json')
const layoutDescriptor = existsSync(layoutDescriptorPath) ? JSON.parse(readFileSync(layoutDescriptorPath)) : layoutName
const updatedMainLayoutsDescriptor = mainLayoutsDescriptor.filter(descriptor => ![descriptor.folder, descriptor].includes(layoutName))

updatedMainLayoutsDescriptor.push(layoutDescriptor)
writeFileSync('layouts.json', JSON.stringify(updatedMainLayoutsDescriptor, undefined, 2) + '\n')
