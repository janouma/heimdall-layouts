import { execSync } from 'child_process'
import env from '../env.js'

execSync(`[ -e ${env.prefix} ] || ln -s . ${env.prefix}`, { stdio: 'inherit' })
