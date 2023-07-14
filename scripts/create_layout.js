import { join } from 'path'
import argsUtils from '@heimdall/utils/args'
import egrep from '@apexearth/egrep'
import { promisify } from 'util'
import renderString from 'es6-template-strings'
import fsExtraCjs from 'fs-extra'

const { copySync, readFileSync, writeFileSync, existsSync } = fsExtraCjs

const layoutFolderPattern = /^([a-z0-9]+)(_[a-z0-9]+)*$/

const {
  name: layoutName,
  folder = convertToValidFolder(layoutName),
  media,
  useDefaultHeader
} = Object.entries(argsUtils.argsArrayToArgsObject())
  .reduce((args, [name, value]) => Object.assign(args, { [name]: value?.trim() }), {})

if (layoutName?.length < 2) {
  throw new Error('"layout" argument must be at least two characters long')
}

if (!folder.match(layoutFolderPattern)) {
  throw new Error(folder + " doesn't match " + layoutFolderPattern)
}

const source = join('src', folder)

if (existsSync(source)) {
  throw new Error(`${folder}(${layoutName}) layout already exists`)
}

const grep = promisify(egrep)

const layoutSearchPattern =
  new RegExp(`^\\s*("folder"\\s*:\\s*"${folder}")|("name"\\s*:\\s*"${layoutName}")\\s*$`)

if (await grep({
  pattern: layoutSearchPattern,
  files: ['src/**/layout.json'],
  objectMode: false,
  glob: true
})) {
  throw new Error(`${folder}(${layoutName}) layout already exists`)
}

const layoutTemplatePath = join('templates', 'layout')
copySync(layoutTemplatePath, source)

const test = join('tests', 'suites', folder, 'main')
const mainTemplate = join('templates', 'tests', 'main')
copySync(mainTemplate, test)

for (const template of [
  join(source, 'assets', 'images', 'icon.svg'),
  join(source, 'assets', 'messages.json'),
  join(source, 'components', 'body', 'index.svelte'),
  join(test, 'views', 'index.html')
]) {
  const parsedContent = renderString(
    readFileSync(template),
    {
      __LAYOUT_NAME__: layoutName,
      __LAYOUT_FOLDER__: folder
    }
  )

  writeFileSync(template, parsedContent)
}

if (layoutName !== folder || media || useDefaultHeader) {
  const booleanMap = {
    yes: true,
    no: false
  }

  const layoutDescriptor = {
    folder,
    name: layoutName,
    media,
    useDefaultHeader: booleanMap[useDefaultHeader]
  }

  writeFileSync(join(source, 'layout.json'), JSON.stringify(layoutDescriptor, undefined, 2))
}

console.info(layoutName + ' layout successfully created')

function convertToValidFolder (name) {
  return name.toLowerCase().replaceAll(/\W+/g, '_')
}
