import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

function findMimoBin(): string {
  const locations = [
    path.join(process.env.APPDATA || '', '..', 'Local', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'npm', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'),
  ]
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc
  }
  try {
    const result = process.platform === 'win32'
      ? execSync('where mimo', { encoding: 'utf-8', timeout: 3000 }).trim().split('\n')[0]
      : execSync('which mimo', { encoding: 'utf-8', timeout: 3000 }).trim()
    if (result && fs.existsSync(result)) return result
  } catch {}
  return 'mimo'
}

const MIMO_PATH = findMimoBin()

export function discoverMimoPath(): string {
  return MIMO_PATH
}

let serveProcess: ChildProcess | null = null
let serveStatus: 'running' | 'stopped' | 'error' = 'stopped'
let serveUrl: string | null = null
const outputCallbacks: Set<(data: { type: 'stdout' | 'stderr'; content: string }) => void> = new Set()

export function startMimoServe(port?: number): Promise<{ success: boolean; url?: string; error?: string }> {
  if (serveProcess && !serveProcess.killed) {
    return Promise.resolve({ success: false, error: 'Serve process already running' })
  }

  return new Promise((resolve) => {
    const args = ['serve']
    if (port) args.push('--port', String(port))

    const child = spawn(MIMO_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    serveProcess = child
    serveStatus = 'running'
    serveUrl = null

    let stderrBuffer = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      for (const cb of outputCallbacks) {
        cb({ type: 'stdout', content: text })
      }
      const urlMatch = text.match(/http[s]?:\/\/[^\s]+/)
      if (urlMatch && !serveUrl) {
        serveUrl = urlMatch[0]
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderrBuffer += text
      for (const cb of outputCallbacks) {
        cb({ type: 'stderr', content: text })
      }
      const urlMatch = text.match(/http[s]?:\/\/[^\s]+/)
      if (urlMatch && !serveUrl) {
        serveUrl = urlMatch[0]
      }
    })

    child.on('error', (error) => {
      serveStatus = 'error'
      serveProcess = null
      resolve({ success: false, error: error.message })
    })

    let settled = false
    child.on('close', (code) => {
      serveStatus = 'stopped'
      serveProcess = null
      serveUrl = null
      if (!settled) {
        settled = true
        if (code !== 0 && code !== null) {
          resolve({ success: false, error: stderrBuffer || `Process exited with code ${code}` })
        }
      }
    })

    setTimeout(() => {
      if (!settled && serveProcess && !serveProcess.killed) {
        settled = true
        resolve({ success: true, url: serveUrl || `http://localhost:${port || 3000}` })
      }
    }, 1500)
  })
}

export function stopMimoServe(): boolean {
  if (serveProcess && !serveProcess.killed) {
    serveProcess.kill()
    serveProcess = null
    serveStatus = 'stopped'
    serveUrl = null
    return true
  }
  return false
}

export function getMimoServeStatus(): { status: 'running' | 'stopped' | 'error'; url: string | null } {
  if (serveProcess && serveProcess.killed) {
    serveStatus = 'stopped'
    serveProcess = null
    serveUrl = null
  }
  return { status: serveStatus, url: serveUrl }
}

export function onMimoServeOutput(callback: (data: { type: 'stdout' | 'stderr'; content: string }) => void): () => void {
  outputCallbacks.add(callback)
  return () => {
    outputCallbacks.delete(callback)
  }
}
