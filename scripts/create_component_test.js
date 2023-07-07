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
const source = join(layoutSource, 'components', componentFolder)

if (!existsSync(source)) {
  throw new Error(`${componentPath} component doesn't exists`)
}

const layoutTestSuite = join('tests', 'suites', layoutFolder)

if (!existsSync(layoutTestSuite)) {
  throw new Error(`${layoutFolder} layout test suite doesn‘t exists`)
}

const testSource = join(layoutTestSuite, componentFolder)

if (existsSync(testSource)) {
  throw new Error(`${componentPath} component test already exists`)
}

const componentTemplatePath = join('templates', 'tests', 'component')
copySync(componentTemplatePath, testSource)

for (const template of [
  join(testSource, 'index.test.ui.js'),
  join(testSource, 'views', 'index.html')
]) {
  const parsedContent = renderString(
    readFileSync(template),
    {
      __LAYOUT_FOLDER__: layoutFolder,
      __COMPONENT_FOLDER__: componentFolder
    }
  )

  writeFileSync(template, parsedContent)
}

console.info(componentPath + ' component test successfully created')
