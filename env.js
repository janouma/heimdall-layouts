import argsUtils from '@heimdall/utils/lib/args.js'

const args = argsUtils.argsArrayToArgsObject()
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
