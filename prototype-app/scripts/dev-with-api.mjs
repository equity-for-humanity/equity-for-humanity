import { spawn } from 'node:child_process'

const children = []
let shuttingDown = false

function run(name, command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: false })
  children.push(child)
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.log(`[${name}] exited with ${signal ?? code}`)
      shutdown(code ?? 0)
    }
  })
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 250)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('api', process.execPath, ['scripts/prototype-api.mjs'])
run('vite', process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5177'])
