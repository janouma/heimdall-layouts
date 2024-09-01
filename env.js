import { argsArrayToArgsObject } from '@byfrost/utils/args.js'

const args = argsArrayToArgsObject()
const useDevPort = args.useDevPort?.trim().toLowerCase() === 'yes'

let enableSourceMap
let origin

if (process.env.NODE_ENV === 'development') {
  enableSourceMap = 'yes'
  origin = process.env.devBaseUrl + ':' + process.env[useDevPort ? 'devPort' : 'testPort']
} else {
  enableSourceMap = 'no'
  origin = process.env.baseUrl + '/' + process.env.prefix
}

export default { enableSourceMap, origin }
