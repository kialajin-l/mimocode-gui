import { spawn, ChildProcess } from 'child_process'

const processes = new Map<string, ChildProcess>()

export function startCliSession(sessionId: string, cwd: string): ChildProcess {
  const proc = spawn('mimocode', ['chat', '--session', sessionId], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  processes.set(sessionId, proc)

  return proc
}

export function sendCliMessage(sessionId: string, message: string) {
  const proc = processes.get(sessionId)
  if (proc && proc.stdin) {
    proc.stdin.write(message + '\n')
  }
}

export function stopCliSession(sessionId: string) {
  const proc = processes.get(sessionId)
  if (proc) {
    proc.kill()
    processes.delete(sessionId)
  }
}

export function getCliProcess(sessionId: string): ChildProcess | undefined {
  return processes.get(sessionId)
}
