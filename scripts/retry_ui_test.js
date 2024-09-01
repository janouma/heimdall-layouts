import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { escapeRegExp } from '@byfrost/utils/string.js'
import { argsArrayToArgsObject } from '@byfrost/utils/args.js'
import { green, red, magenta } from '@byfrost/utils/console.js'
import playwrightConfig from '../playwright.config.js'

const { maxAttempts } = argsArrayToArgsObject()

if (maxAttempts == null) {
  throw new Error('maxAttempts argument is missing')
}

if (maxAttempts <= 0) {
  console.warn(magenta('maxAttempts < 1, nothing to run'))
  process.exit(1)
}

const { reporter } = playwrightConfig

if (!Array.isArray(reporter)) {
  throw new Error('No custom reporter configured')
}

const [, customReporterOptions] = reporter
  .find((entry) => Array.isArray(entry) && entry[0] === '@byfrost/utils/tests/helpers/reporter.js') || []

if (!customReporterOptions) {
  throw new Error('Custom reporter has no options')
}

const { outputFile: failuresReport } = customReporterOptions

if (existsSync(failuresReport)) {
  const failures = JSON.parse(readFileSync(failuresReport))

  const filter = Object.entries(failures)
    .map(([project, suite]) => {
      const projectFilter = Object.entries(suite).map(
        ([testFile, tests]) => {
          const suiteFilter = tests.map(({ title }) => '\\b' + escapeRegExp(title).replaceAll('"', '\\"')).join('|')
          return `\\b${escapeRegExp(testFile)}\\b.+(${suiteFilter})$`
        }
      ).join('|')

      return `\\b${project}\\b.+(${projectFilter})`
    }).join('|')

  const command = `npm run test:ui -- --grep '"${filter}"'`

  const fallBackCommand = maxAttempts > 1
    ? `npm run test:ui:retry -- maxAttempts=${maxAttempts - 1}`
    : `echo "${red('✘ all attempts failed')}"`

  try {
    execSync(command + ' || ' + fallBackCommand, { stdio: 'inherit' })
  } catch (error) {
    process.exit(1)
  }
} else {
  console.info(green('no failure occured on the previous test run'))
}
