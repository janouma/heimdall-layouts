let enableSourceMap
let origin

if (process.env.NODE_ENV === 'development') {
  enableSourceMap = 'yes'
  origin = process.env.npm_package_config_dev_baseUrl + ':' + process.env.npm_package_config_testPort
} else {
  enableSourceMap = 'no'
  origin = process.env.npm_package_config_baseUrl + '/' + process.env.npm_package_config_prefix
}

export default { enableSourceMap, origin }
