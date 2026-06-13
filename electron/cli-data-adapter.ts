import { execFile } from 'child_process'
import { getMimoPath } from './cli-bridge'

interface SessionEntry {
  id: string
  name?: string
  path?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}

interface ExportedSession {
  id: string
  name?: string
  messages?: any[]
  [key: string]: any
}

function execMimo(args: string[], timeout = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const mimoPath = getMimoPath()
    execFile(mimoPath, args, { encoding: 'utf-8', timeout }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
      } else {
        resolve(stdout)
      }
    })
  })
}

export async function fetchSessionList(): Promise<SessionEntry[]> {
  try {
    const output = await execMimo(['session', 'list', '--format', 'json'])
    const parsed = JSON.parse(output)
    return Array.isArray(parsed) ? parsed : (parsed.sessions || [])
  } catch (err) {
    console.error('[CliDataAdapter] fetchSessionList error:', err)
    return []
  }
}

export async function exportSession(sessionId: string): Promise<ExportedSession | null> {
  try {
    if (!sessionId || typeof sessionId !== 'string') return null
    // Validate sessionId pattern to prevent CLI flag injection
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) return null
    const output = await execMimo(['export', sessionId])
    return JSON.parse(output)
  } catch (err) {
    console.error('[CliDataAdapter] exportSession error:', err)
    return null
  }
}
