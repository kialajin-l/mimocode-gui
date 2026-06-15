import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { buildRunArgs, getEventText, getEventToolName } from './cli-message'

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

let cliHealthy: boolean | null = null

export function checkCliHealth(): { healthy: boolean; path: string; error?: string } {
  if (MIMO_PATH === 'mimo') {
    return { healthy: false, path: MIMO_PATH, error: '找不到 mimo 可执行文件，请确认已安装 MiMo CLI 并加入 PATH' }
  }
  if (!fs.existsSync(MIMO_PATH)) {
    return { healthy: false, path: MIMO_PATH, error: `mimo 路径不存在: ${MIMO_PATH}，请重新安装或手动配置路径` }
  }
  try {
    execSync(`"${MIMO_PATH}" --version`, { encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] })
    cliHealthy = true
    return { healthy: true, path: MIMO_PATH }
  } catch (e) {
    cliHealthy = false
    return { healthy: false, path: MIMO_PATH, error: `mimo CLI 无法启动: ${(e as Error).message}` }
  }
}

export function isCliHealthy(): boolean | null { return cliHealthy }

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

export interface CliProviderInfo {
  id: string
  label: string
  source: string
  baseUrl?: string
  models: string[]
}

export function getCliProviderApiKey(baseUrl: string): string | undefined {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '').toLowerCase()
  if (!normalizedBaseUrl) return undefined

  if (normalizedBaseUrl.includes('deepseek.com')) {
    return process.env.DEEPSEEK_API_KEY
  }

  const authPath = path.join(process.env.USERPROFILE || '', '.local', 'share', 'mimocode', 'auth.json')
  try {
    if (!fs.existsSync(authPath)) return undefined
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
    const xiaomi = auth?.xiaomi
    const xiaomiBaseUrl = String(xiaomi?.metadata?.base_url || '').trim().replace(/\/+$/, '').toLowerCase()
    if (xiaomiBaseUrl && xiaomiBaseUrl === normalizedBaseUrl) {
      return xiaomi?.key
    }
  } catch {
    return undefined
  }

  return undefined
}

export function listCliProviders(): CliProviderInfo[] {
  const models = listModels()
  const providers = new Map<string, CliProviderInfo>()

  const addProvider = (id: string, label: string, source: string, providerModels: string[], baseUrl?: string) => {
    const uniqueModels = Array.from(new Set(providerModels)).filter(Boolean)
    if (uniqueModels.length === 0) return
    providers.set(id, { id, label, source, baseUrl, models: uniqueModels })
  }

  const authPath = path.join(process.env.USERPROFILE || '', '.local', 'share', 'mimocode', 'auth.json')
  let xiaomiSource = 'MiMo CLI'
  let xiaomiLabel = 'Xiaomi'
  let xiaomiBaseUrl: string | undefined
  try {
    if (fs.existsSync(authPath)) {
      const raw = fs.readFileSync(authPath, 'utf-8')
      const auth = JSON.parse(raw)
      const xiaomi = auth?.xiaomi
      xiaomiBaseUrl = xiaomi?.metadata?.base_url
      if (xiaomi) {
        xiaomiSource = xiaomi.type === 'api' ? 'Credentials' : 'MiMo CLI'
      }
      if (typeof xiaomiBaseUrl === 'string' && xiaomiBaseUrl.includes('token-plan')) {
        xiaomiLabel = 'Xiaomi Token Plan'
      }
    }
  } catch {
    // Ignore malformed CLI auth files; the model list remains authoritative.
  }

  addProvider('cli:mimo', 'MiMo', 'Native', models.filter(model => model.startsWith('mimo/')))
  addProvider('cli:xiaomi', xiaomiLabel, xiaomiSource, models.filter(model => model.startsWith('xiaomi/')), xiaomiBaseUrl)

  const deepSeekSource = process.env.DEEPSEEK_API_KEY ? 'Environment' : 'MiMo CLI'
  addProvider('cli:deepseek', 'DeepSeek', deepSeekSource, models.filter(model => model.startsWith('deepseek/')), 'https://api.deepseek.com')

  const knownPrefixes = new Set(['mimo', 'xiaomi', 'deepseek'])
  for (const model of models) {
    const [prefix] = model.split('/')
    if (!prefix || knownPrefixes.has(prefix)) continue
    const label = prefix
      .split(/[-_]/)
      .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
      .join(' ')
    addProvider(`cli:${prefix}`, label, 'MiMo CLI', models.filter(item => item.startsWith(`${prefix}/`)))
    knownPrefixes.add(prefix)
  }

  return Array.from(providers.values())
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
    mode?: string
    onChunk?: (chunk: { type: string; content: string }) => void
    onComplete?: (fullText: string) => void
    onError?: (error: string) => void
  }
): Promise<void> {
  const sessionId = options.sessionId || randomUUID()

  try {
    if (MIMO_PATH === 'mimo' || !fs.existsSync(MIMO_PATH)) {
      options.onError?.('找不到 mimo 可执行文件。请确认已安装 MiMo CLI 并加入 PATH，或在设置中配置 mimo 路径。')
      return
    }

    const args = buildRunArgs({
      message,
      model: options.model,
      variant: options.variant,
      permission: options.permission,
      mode: options.mode,
    })

    const child = spawn(MIMO_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: options.cwd
    })

    processes.set(sessionId, child)
    child.stdin?.end()

    let fullText = ''
    let stderrBuffer = ''
    let jsonLineBuffer = ''
    let lastChunkType: 'json' | 'text' | null = null

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      jsonLineBuffer += text

      // Process complete lines from buffer
      let newlineIdx: number
      while ((newlineIdx = jsonLineBuffer.indexOf('\n')) !== -1) {
        const line = jsonLineBuffer.slice(0, newlineIdx)
        jsonLineBuffer = jsonLineBuffer.slice(newlineIdx + 1)
        processStdoutLine(line, 'json')
      }

      // Try to parse remaining buffer as JSON; if valid, process it; otherwise flush as text
      const remaining = jsonLineBuffer
      if (remaining) {
        try {
          const event = JSON.parse(remaining)
          const eventText = getEventText(event)
          const toolName = getEventToolName(event)
          if (event.type === 'text' && eventText) {
            fullText += eventText
            options.onChunk?.({ type: 'text', content: eventText })
          } else if (event.type === 'tool_use' && toolName) {
            options.onChunk?.({ type: 'tool_use', content: `Tool: ${toolName}` })
          } else if (event.type === 'tool_result' && eventText) {
            options.onChunk?.({ type: 'tool_result', content: eventText })
          } else if (event.type === 'thinking' && eventText) {
            options.onChunk?.({ type: 'thinking', content: eventText })
          }
          lastChunkType = 'json'
        } catch {
          // Not valid JSON, flush as text
          fullText += remaining
          options.onChunk?.({ type: 'text', content: remaining })
          lastChunkType = 'text'
        }
        jsonLineBuffer = ''
      }
    })

    function processStdoutLine(line: string, fallbackType: 'json' | 'text') {
      const trimmed = line.trim()
      if (!trimmed) return

      // Try JSON parse
      if (trimmed.startsWith('{')) {
        try {
          const event = JSON.parse(trimmed)
          const eventText = getEventText(event)
          const toolName = getEventToolName(event)
          if (event.type === 'text' && eventText) {
            fullText += eventText
            options.onChunk?.({ type: 'text', content: eventText })
          } else if (event.type === 'tool_use' && toolName) {
            options.onChunk?.({ type: 'tool_use', content: `Tool: ${toolName}` })
          } else if (event.type === 'tool_result' && eventText) {
            options.onChunk?.({ type: 'tool_result', content: eventText })
          } else if (event.type === 'thinking' && eventText) {
            options.onChunk?.({ type: 'thinking', content: eventText })
          }
          lastChunkType = 'json'
          return
        } catch {
          // Not valid JSON, treat as text
        }
      }

      // Plain text fallback
      fullText += trimmed + '\n'
      options.onChunk?.({ type: 'text', content: trimmed + '\n' })
      lastChunkType = 'text'
    }

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
      // Flush any remaining JSON line buffer
      if (jsonLineBuffer.trim()) {
        processStdoutLine(jsonLineBuffer, lastChunkType || 'json')
        jsonLineBuffer = ''
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
