#!/usr/bin/env node

import { exec } from 'child_process'
import { readFileSync } from 'fs'
import argsUtils from '@heimdall/utils/lib/args.js'

const args = argsUtils.argsArrayToArgsObject()
const envFile = process.env.envFile || args.envFile || '.env'
process.env.envFile = envFile

console.log(`\x1b[4m\x1b[3menvFile: ${process.env.envFile}\x1b[23m\x1b[24m\n`)

const env = JSON.parse(String(readFileSync(envFile)))
Object.assign(process.env, env)

const commandExtraArgs = Object.entries(args)
  .filter(([name]) => !['command', 'envFile'].includes(name))
  .map(([name, value]) => value ? `${name}=${value}` : name)
  .join(' ')

const command = `${args.command} ${commandExtraArgs}`

console.log(`\x1b[7m\x1b[1m\x1b[94m running command "${command.trim()}" \n\x1b[39m\x1b[22m\x1b[27m`)

const subProcess = exec(command)

subProcess.stdout.pipe(process.stdout)
subProcess.stderr.pipe(process.stderr)

function onEnd (code) {
  process.exit(code)
}

subProcess.on('close', onEnd)
subProcess.on('exit', onEnd)
