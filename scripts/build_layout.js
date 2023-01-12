import shell from 'shelljs'
import { join, basename } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import argsUtils from '@heimdall/utils/args'

const args = argsUtils.argsArrayToArgsObject()

if (!args.layout?.trim()) {
  throw new Error('"layout" argument is missing')
}

const testMainViewPath = join('tests', 'suites', 'dashboard', 'main', 'views', 'index.html')
if (!existsSync(testMainViewPath)) {
  throw new Error(`test view ${testMainViewPath} is missing`)
}

const mainLayoutsDescriptor = JSON.parse(readFileSync('layouts.json'))
const source = join('src', args.layout)

if (!existsSync(source)) {
  throw new Error(`"${source}" layout doesn't exist`)
}

const destination = join('layouts', args.layout)

if (existsSync(destination)) {
  shell.rm('-rf', destination)
}

shell.mkdir(destination)

const statics = shell.find(join(source, '*')).filter(file => !file.match(new RegExp(`/components/?|\\.DS_Store$|^${source}/[^/](?=.+/)|.*\\.afdesign$`)))

console.debug('statics:', statics)

shell.cp('-R', statics, destination)

const componentsDir = join(source, 'components')
const components = shell.find(join(componentsDir, '*')).filter(file => file.match(new RegExp(`^${componentsDir}/(header|body)$`)))

console.debug('components:', components)

const indexStatements = []

for (const component of components) {
  const compileResult = shell.exec(`utils-compile-svelte source="${component}" destination="${destination}" prefix="/heimdall-layouts/${destination}/"`)

  if (compileResult.code > 0) {
    throw new Error('failed to compile component ' + component)
  } else {
    indexStatements.push(`import './${basename(component)}/index.js'`)
    console.info('successfully compiled component ' + component)
  }
}

writeFileSync(join(destination, 'index.js'), indexStatements.join('\n') + '\n')

const layoutDescriptorPath = join(source, 'layout.json')
const layoutDescriptor = existsSync(layoutDescriptorPath) ? JSON.parse(readFileSync(layoutDescriptorPath)) : args.layout
const updatedMainLayoutsDescriptor = mainLayoutsDescriptor.filter(descriptor => ![descriptor.folder, descriptor].includes(args.layout))

updatedMainLayoutsDescriptor.push(layoutDescriptor)
writeFileSync('layouts.json', JSON.stringify(updatedMainLayoutsDescriptor, undefined, 2) + '\n')