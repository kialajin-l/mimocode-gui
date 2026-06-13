import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

function findMimoBin(): string {
  const fromShim = (shimPath: string) => {
    const shimDir = path.dirname(shimPath)
    const candidates = [
      path.join(shimDir, 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
      path.join(shimDir, 'node_modules', '@mimo-ai', 'cli', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe')
    ]
    return candidates.find(candidate => fs.existsSync(candidate)) || null
  }

  const locations = [
    path.join(process.env.APPDATA || '', '..', 'Local', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
  ]
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc
  }

  // Try to find via PATH
  try {
    const result = process.platform === 'win32'
      ? execSync('where mimo 2>nul || where mimo.cmd 2>nul || where mimo.exe', { encoding: 'utf-8', timeout: 3000 }).trim().split(/\r?\n/)[0]
      : execSync('which mimo', { encoding: 'utf-8', timeout: 3000 }).trim()
    if (process.platform === 'win32') {
      const exe = fromShim(result)
      if (exe) return exe
    }
    if (result && fs.existsSync(result)) return result
  } catch {}

  return 'mimo'
}

const MIMO_PATH = findMimoBin()

export function getMimoPath(): string { return MIMO_PATH }

export function listModels(): string[] {
  try {
    return execSync(`"${MIMO_PATH}" models`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.includes('/') && !line.includes(' '))
      .slice(0, 200)
  } catch {
    return []
  }
}

// Active processes for session management
const processes = new Map<string, ChildProcess>()

export async function sendMessage(
  message: string,
  options: {
    sessionId?: string
    cwd?: string
    model?: string
    variant?: string
    permission?: string
    onChunk?: (chunk: { type: string; content: string }) => void
    onComplete?: (fullText: string) => void
    onError?: (error: string) => void
  }
): Promise<void> {
  const sessionId = options.sessionId || randomUUID()

  try {
    const args = ['run', message]
    if (options.model && options.model.includes('/')) {
      args.push('--model', options.model)
    }
    if (options.variant) {
      args.push('--variant', options.variant)
    }
    if (options.permission === 'execute') {
      args.push('--dangerously-skip-permissions')
    }

    const child = spawn(MIMO_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: options.cwd
    })

    processes.set(sessionId, child)
    child.stdin?.end()

    let fullText = ''
    let stderrBuffer = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      fullText += text
      options.onChunk?.({ type: 'text', content: text })
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderrBuffer += text
      for (const line of stripAnsi(text).split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const metadataMatch = trimmed.match(/^>\s*(.+)$/)
        if (metadataMatch) {
          options.onChunk?.({ type: 'metadata', content: metadataMatch[1].trim() })
        } else {
          options.onChunk?.({ type: 'thinking', content: trimmed })
        }
      }
    })

    child.on('error', (error) => {
      if (processes.get(sessionId) === child) {
        processes.delete(sessionId)
      }
      options.onError?.(error.message)
    })

    child.on('close', (code) => {
      if (processes.get(sessionId) === child) {
        processes.delete(sessionId)
      }
      if (code === 0) {
        if (fullText.trim()) {
          options.onComplete?.(fullText)
        } else {
          options.onError?.(stripAnsi(stderrBuffer).trim() || 'MiMo exited without output')
        }
      } else {
        options.onError?.(stripAnsi(stderrBuffer).trim() || `Process exited with code ${code}`)
      }
    })
  } catch (error) {
    options.onError?.((error as Error).message)
  }
}

function stripAnsi(text: string) {
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
}

export function cancelMessage(sessionId: string): boolean {
  const child = processes.get(sessionId)
  if (child && !child.killed) {
    child.kill()
    processes.delete(sessionId)
    return true
  }
  return false
}

export function isProcessRunning(sessionId: string): boolean {
  const child = processes.get(sessionId)
  return child !== undefined && !child.killed
}

export function stopAllProcesses() {
  for (const [id, child] of processes) {
    if (!child.killed) child.kill()
  }
  processes.clear()
}
