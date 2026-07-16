import { join } from 'path'
import { readdirSync } from 'fs'
import { argsArrayToArgsObject } from '@byfrost/utils/args.js'
import { render as renderString } from '@byfrost/utils/string.js'
import fsExtraCjs from 'fs-extra'

const { copySync, readFileSync, writeFileSync, existsSync } = fsExtraCjs

const componentPathPattern = /^([a-z0-9]+)(_[a-z0-9]+)*\/([a-z0-9]+)(_[a-z0-9]+)*$/
const { name: componentPath, type: componentType } = argsArrayToArgsObject()
const componentTemplatePath = join('templates', 'component')

const availableTypes = readdirSync(componentTemplatePath, { withFileTypes: true })
  .filter(file => file.isDirectory() && file.name !== '.DS_Store')
  .map(file => file.name)

if (!componentType) {
  throw new Error('component type is missing. Expected ' + availableTypes.join(' or '))
}

if (!availableTypes.includes(componentType)) {
  throw new Error(`component type ${componentType} is not supported. Allowed ${availableTypes}`)
}

if (!componentPath?.match(componentPathPattern)) {
  throw new Error(componentPath + " doesn't match " + componentPathPattern)
}

const [layoutFolder, componentFolderBase] = componentPath.split('/')
const layoutSource = join('src', layoutFolder)

if (!existsSync(layoutSource)) {
  throw new Error(`${layoutFolder} layout doesn‘t exists`)
}

const componentFolder = `hdl_${layoutFolder}_${componentFolderBase}`
const source = join(layoutSource, 'components', componentFolder)

if (existsSync(source)) {
  throw new Error(`${componentPath} component already exists`)
}

const componentTypeFolder = join(componentTemplatePath, componentType)
copySync(componentTypeFolder, source)

const [indexFile] = readdirSync(componentTypeFolder).filter(file => file.match(/^index\.\w+/))
const template = join(source, indexFile)

const parsedContent = renderString(
  String(readFileSync(template)),
  {
    __LAYOUT_FOLDER__: layoutFolder,
    __COMPONENT_FOLDER__: componentFolder
  }
)

writeFileSync(template, parsedContent)

console.info(componentPath + ' component successfully created')
