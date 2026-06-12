import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

function findMimoBin(): string {
  const locations = [
    path.join(process.env.APPDATA || '', '..', 'Local', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
  ]
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc
  }
  return 'mimo'
}

const MIMO_PATH = findMimoBin()

export function getMimoPath(): string { return MIMO_PATH }

// Active processes for session management
const processes = new Map<string, ChildProcess>()

export async function sendMessage(
  message: string,
  options: {
    sessionId?: string
    cwd?: string
    onChunk?: (chunk: { type: string; content: string }) => void
    onComplete?: (fullText: string) => void
    onError?: (error: string) => void
  }
): Promise<void> {
  const sessionId = options.sessionId || randomUUID()

  try {
    const args = ['run', message]
    
    const child = spawn(MIMO_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: options.cwd
    })

    processes.set(sessionId, child)

    // Close stdin immediately to prevent hanging
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
      
      // Parse stderr for metadata (e.g., "> build · mimo-auto")
      const metadataMatch = text.match(/^>\s*(\w+)\s*·\s*(\S+)/)
      if (metadataMatch) {
        options.onChunk?.({ 
          type: 'metadata', 
          content: text.trim()
        })
      }
    })

    child.on('error', (error) => {
      processes.delete(sessionId)
      options.onError?.(error.message)
    })

    child.on('close', (code) => {
      processes.delete(sessionId)
      if (code === 0) {
        options.onComplete?.(fullText)
      } else {
        options.onError?.(stderrBuffer || `Process exited with code ${code}`)
      }
    })
  } catch (error) {
    options.onError?.((error as Error).message)
  }
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
    if (!child.killed) {
      child.kill()
    }
  }
  processes.clear()
}

// Legacy exports for compatibility
export function listSessions(): Promise<Array<{ id: string; title: string; updated: string }>> {
  return Promise.resolve([])
}

export function deleteSession(_sessionId: string): Promise<boolean> {
  return Promise.resolve(true)
}

export function exportSession(_sessionId: string): Promise<null> {
  return Promise.resolve(null)
}

export function getServerUrl(): string { return '' }
export function isServerReady(): boolean { return true }
export function startServer(): Promise<boolean> { return Promise.resolve(true) }
export function stopServer() { stopAllProcesses() }
