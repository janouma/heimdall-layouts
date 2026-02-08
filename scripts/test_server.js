import { execSync } from 'child_process'
import env from '../env.js'

console.info('test server running at port', env.port)

execSync(
  `npx http-server --silent -p ${env.port} -c1 -S -C assets/ssl/cert.pem -K assets/ssl/key.pem --cors`,
  { stdio: 'inherit' }
)
