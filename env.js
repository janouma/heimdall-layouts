import { argsArrayToArgsObject } from '@byfrost/utils/args.js'

const NODE_ENV = process.env.NODE_ENV || 'production'
const isDevEnv = NODE_ENV === 'development'
const { useDevPort } = argsArrayToArgsObject()

let enableSourceMap
let computedPort

const {
  default: env,
  default: { port, baseUrl, prefix }
} = await import(`./project.${NODE_ENV}.config.js`)

const testEnv = isDevEnv && await import('./project.test.config.js')

if (isDevEnv) {
  enableSourceMap = 'yes'
  computedPort = useDevPort ? port : testEnv.default.port
} else {
  enableSourceMap = 'no'
  computedPort = port
}

const portSegment = computedPort ? ':' + computedPort : ''
const prefixSegment = prefix ? '/' + prefix : ''
const origin = `${baseUrl}${portSegment}${prefixSegment}`

export default { ...env, enableSourceMap, origin }
