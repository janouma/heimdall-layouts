import { join } from 'path'
import argsUtils from '@heimdall/utils/args'
import renderString from 'es6-template-strings'
import fsExtraCjs from 'fs-extra'

const { copySync, readFileSync, writeFileSync, existsSync } = fsExtraCjs

const componentPathPattern = /^([a-z0-9]+)(_[a-z0-9]+)*\/([a-z0-9]+)(_[a-z0-9]+)*$/
const componentPath = argsUtils.argsArrayToArgsObject().name?.trim()

if (!componentPath?.match(componentPathPattern)) {
  throw new Error(componentPath + " doesn't match " + componentPathPattern)
}

const [layoutFolder, componentFolder] = componentPath.split('/')
const layoutSource = join('src', layoutFolder)

if (!existsSync(layoutSource)) {
  throw new Error(`${layoutFolder} layout doesn‘t exists`)
}

const source = join(layoutSource, 'components', componentFolder)

if (existsSync(source)) {
  throw new Error(`${componentPath} component already exists`)
}

const componentTemplatePath = join('templates', 'component')
copySync(componentTemplatePath, source)

const template = join(source, 'index.svelte')

const parsedContent = renderString(
  readFileSync(template),
  {
    __LAYOUT_FOLDER__: layoutFolder,
    __COMPONENT_FOLDER__: componentFolder
  }
)

writeFileSync(template, parsedContent)

console.info(componentPath + ' component successfully created')
