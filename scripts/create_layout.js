import { join } from 'path'
import { readdirSync } from 'fs'
import { argsArrayToArgsObject } from '@byfrost/utils/args.js'
import { render as renderString } from '@byfrost/utils/string.js'
import egrep from '@apexearth/egrep'
import { promisify } from 'util'
import fsExtraCjs from 'fs-extra'

const {
  copySync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync
} = fsExtraCjs

const layoutFolderPattern = /^([a-z0-9]+)(_[a-z0-9]+)*$/

const {
  name: layoutName,
  folder = convertToValidFolder(layoutName),
  media,
  useDefaultHeader,
  type: componentType
} = argsArrayToArgsObject()

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

const layoutTemplatePath = join('templates', 'layout')
const bodyComponentsRelativePath = join('components', 'body')
const bodyComponentPath = join(layoutTemplatePath, bodyComponentsRelativePath)

const availableTypes = readdirSync(bodyComponentPath, { withFileTypes: true })
  .filter(file => file.isDirectory() && file.name !== '.DS_Store')
  .map(file => file.name)

if (!componentType) {
  throw new Error('component type is missing. Expected ' + availableTypes.join(' or '))
}

if (!availableTypes.includes(componentType)) {
  throw new Error(`component type ${componentType} is not supported. Allowed ${availableTypes}`)
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

const layoutTemplateFiles = readdirSync(layoutTemplatePath)
  .filter(file => !['.DS_Store', 'components'].includes(file))

for (const file of layoutTemplateFiles) {
  copySync(join(layoutTemplatePath, file), join(source, file))
}

const componentTypeFolder = join(bodyComponentPath, componentType)
const bodyComponentSource = join(source, bodyComponentsRelativePath)
copySync(componentTypeFolder, bodyComponentSource)

const [indexFile] = readdirSync(bodyComponentSource).filter(file => file.match(/^index\.\w+/))

const test = join('tests', 'suites', folder, 'main')
const mainTemplate = join('templates', 'tests', 'main')
copySync(mainTemplate, test)

const bodyComponentClassName =
  `Hdl${folder[0].toUpperCase()}${folder.slice(1).toLowerCase()}Body`

for (const template of [
  join(source, 'assets', 'images', 'icon.svg'),
  join(source, 'assets', 'messages.json'),
  join(bodyComponentSource, indexFile),
  join(test, 'views', 'index.html')
]) {
  const parsedContent = renderString(
    String(readFileSync(template)),
    {
      __LAYOUT_NAME__: layoutName,
      __LAYOUT_FOLDER__: folder,
      __BODY_COMPONENT_CLASS_NAME__: bodyComponentClassName
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

renameSync(
  join(source, bodyComponentsRelativePath),
  join(source, 'components', `hdl_${folder}_body`)
)

console.info(layoutName + ' layout successfully created')

function convertToValidFolder (name) {
  return name.toLowerCase().replaceAll(/\W+/g, '_')
}
