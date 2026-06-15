import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { spawn, execFileSync, ChildProcess } from 'child_process'
import { sendMessage, cancelMessage, getMimoPath, listModels, listCliProviders, getCliProviderApiKey, stopAllProcesses } from './cli-bridge'
import { startMimoServe, stopMimoServe, getMimoServeStatus, onMimoServeOutput } from './mimo-process'
import { fetchSessionList, exportSession } from './cli-data-adapter'
import { readMemoryFiles, readCheckpoints } from './local-data-adapter'
import {
  validateFilePath, validateCwd, isSensitiveFile,
  isDangerousCommand, logOperation, getAuthorizedWorkspaces, authorizeWorkspace
} from './security-ipc'
import { scanPluginDirectories } from './plugin-scanner'
import { scanSkillDirectories } from './skill-scanner'
import { loadMcpConfig, saveMcpConfig, addMcpServer, updateMcpServer, removeMcpServer, toggleMcpServer } from './mcp-manager'
import { buildProviderModelUrls, extractModelIds } from './provider-models'

const DATA_DIR = app.getPath('userData')
const DATA_FILE = path.join(DATA_DIR, 'sessions.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const SKILLS_FILE = path.join(DATA_DIR, 'skills.json')
const KEYS_FILE = path.join(DATA_DIR, 'keys.json')

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('[Main] Unhandled rejection:', err)
})

let mainWindow: BrowserWindow | null = null

function getWindowIconPath() {
  const iconPath = path.join(__dirname, '..', 'build', 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  return fs.existsSync(iconPath) ? iconPath : undefined
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })
  mainWindow.setMenuBarVisibility(false)

  const distPath = path.join(__dirname, '..', 'dist', 'index.html')
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath)
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('crashed', () => {
    console.error('[Main] Renderer process crashed')
  })

  // WebView security: restrict URL sources and disable dangerous permissions
  // data:text/html removed — no renderer code uses data URIs; MiMo serve uses IPC, not webview data URIs
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    const url = params.src || ''
    const appPath = app.getAppPath().replace(/\\/g, '/')

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/.test(url)
    const isAppFile = url.startsWith('file://') && url.slice(7).replace(/\\/g, '/').startsWith(appPath)

    if (!isLocalhost && !isAppFile) {
      console.warn('[Main] Blocked webview attachment to disallowed URL:', url)
      event.preventDefault()
      return
    }

    // Strip dangerous permissions
    delete webPreferences.nodeIntegration
    delete webPreferences.preload
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
  })
}

ipcMain.handle('send-message', async (_, sessionId: string, message: string, cwd?: string, model?: string, permission?: string, variant?: string, mode?: string) => {
  try {
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      logOperation('security-block', { operation: 'send-message', reason: cwdResult.error! })
      return { success: false, error: `工作区未授权: ${cwdResult.error}` }
    }

    return await new Promise((resolve) => {
      sendMessage(message, {
        sessionId,
        cwd: cwdResult.resolved,
        model,
        variant,
        permission,
        mode,
        onChunk: (chunk) => {
          try {
            mainWindow?.webContents.send('message-chunk', sessionId, chunk)
          } catch (e) {
            console.error('[Main] Failed to send chunk:', e)
          }
        },
        onComplete: (text) => {
          resolve({ success: true, content: text })
        },
        onError: (error) => {
          resolve({ success: false, error })
        }
      })
    })
  } catch (err) {
    console.error('[Main] send-message error:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('cancel-message', (_, sessionId: string) => {
  try {
    return cancelMessage(sessionId)
  } catch (err) {
    console.error('[Main] cancel-message error:', err)
    return false
  }
})

ipcMain.handle('get-mimo-path', () => {
  try {
    return getMimoPath()
  } catch (err) {
    return 'mimo'
  }
})

ipcMain.handle('list-models', () => {
  try {
    return { success: true, models: listModels() }
  } catch (err) {
    return { success: false, models: [], error: String(err) }
  }
})

ipcMain.handle('list-cli-providers', () => {
  try {
    return { success: true, providers: listCliProviders() }
  } catch (err) {
    return { success: false, providers: [], error: String(err) }
  }
})

// Helper: HTTP GET request using Node.js http/https modules (reliable in Electron main)
function httpGet(urlStr: string, headers: Record<string, string>, timeout = 15000): Promise<{ ok: boolean; status: number; body: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      req.destroy()
      resolve({ ok: false, status: 0, body: 'Request timeout' })
    }, timeout)

    const parsed = new URL(urlStr)
    const mod = parsed.protocol === 'https:' ? https : http
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      rejectUnauthorized: true,
    }

    const req = mod.request(options, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        clearTimeout(timer)
        resolve({ ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300, status: res.statusCode || 0, body })
      })
    })

    req.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, status: 0, body: err.message })
    })

    req.end()
  })
}

ipcMain.handle('fetch-provider-models', async (_, baseUrl: string, apiKey?: string, providerId?: string) => {
  try {
    const candidates = buildProviderModelUrls(baseUrl)

    const headers: Record<string, string> = { 'Accept': 'application/json' }
    const secureKey = getApiKeyForProvider(providerId)
    const effectiveApiKey = secureKey || apiKey || getCliProviderApiKey(baseUrl)
    if (effectiveApiKey) {
      headers['Authorization'] = `Bearer ${effectiveApiKey}`
    }

    let lastError = ''
    for (const candidate of candidates) {
      try {
        console.log('[Main] Trying:', candidate)
        const { ok, status, body } = await httpGet(candidate, headers)

        if (!ok) {
          lastError = `HTTP ${status} (${candidate})`
          console.log('[Main] Failed:', candidate, status, body.substring(0, 200))
          continue
        }

        // Try to parse as JSON
        let data: any
        try {
          data = JSON.parse(body)
        } catch {
          lastError = `Invalid JSON response from ${candidate}`
          console.log('[Main] Invalid JSON from:', candidate, body.substring(0, 200))
          continue
        }

        const models = extractModelIds(data)

        if (models.length > 0) {
          console.log('[Main] Successfully fetched', models.length, 'models from', candidate)
          return { success: true, models: models.slice(0, 500) }
        }

        lastError = `No models found in response from ${candidate}`
        console.log('[Main] No models in response from:', candidate, 'Response keys:', Object.keys(data || {}))
      } catch (e: any) {
        lastError = e?.message || String(e)
        console.log('[Main] Error fetching:', candidate, lastError)
      }
    }

    return { success: false, models: [], error: lastError || '未获取到模型，请检查 Base URL 和 API Key' }
  } catch (err: any) {
    console.error('[Main] fetch-provider-models error:', err)
    return { success: false, models: [], error: err?.message || String(err) }
  }
})

ipcMain.handle('cli-health', () => {
  try {
    const { checkCliHealth } = require('./cli-bridge')
    return checkCliHealth()
  } catch (err) {
    return { healthy: false, path: '', error: String(err) }
  }
})

ipcMain.handle('load-data', () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[Main] load-data error:', err)
  }
  return null
})

ipcMain.handle('save-data', (_, data: any) => {
  try {
    if (!data || typeof data !== 'object') return false
    if (data.sessions && !Array.isArray(data.sessions)) return false
    if (data.projects && !Array.isArray(data.projects)) return false
    if (data.activeSessionId !== null && data.activeSessionId !== undefined && typeof data.activeSessionId !== 'string') return false
    if (data.skills && !Array.isArray(data.skills)) return false
    if (data.plugins && !Array.isArray(data.plugins)) return false

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('[Main] save-data error:', err)
    return false
  }
})

ipcMain.handle('sync-workspaces', (_, cwds: string[]) => {
  if (Array.isArray(cwds)) {
    for (const cwd of cwds) {
      if (typeof cwd === 'string' && cwd) {
        authorizeWorkspace(cwd)
      }
    }
  }
  return { success: true }
})

// --- API Key Secure Storage ---

function loadKeys(): Record<string, string> {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const raw = fs.readFileSync(KEYS_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (typeof data === 'object' && data !== null) return data
    }
  } catch { /* ignore */ }
  return {}
}

function saveKeys(keys: Record<string, string>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8')
}

function maskApiKey(key: string): string {
  if (!key || key.length < 6) return '****'
  return `${key.slice(0, 2)}****${key.slice(-4)}`
}

ipcMain.handle('api-key-save', (_, providerId: string, apiKey: string) => {
  try {
    if (!providerId || typeof apiKey !== 'string') {
      return { success: false, error: 'Invalid parameters' }
    }
    const keys = loadKeys()
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey)
      keys[providerId] = encrypted.toString('base64')
    } else {
      // Fallback: base64 encode (not secure, but functional on headless/no-display systems)
      keys[providerId] = Buffer.from(apiKey).toString('base64')
    }
    saveKeys(keys)
    return { success: true }
  } catch (err) {
    console.error('[Main] api-key-save error:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('api-key-get-status', (_, providerId: string) => {
  try {
    if (!providerId) return { configured: false }
    const keys = loadKeys()
    const stored = keys[providerId]
    if (!stored) return { configured: false }

    let key = ''
    try {
      if (safeStorage.isEncryptionAvailable()) {
        key = safeStorage.decryptString(Buffer.from(stored, 'base64'))
      } else {
        key = Buffer.from(stored, 'base64').toString()
      }
    } catch (err: any) {
      console.warn('[Main] Failed to decrypt API key for provider:', providerId, err?.message || err)
      return { configured: false, error: 'Key decryption failed' }
    }
    return { configured: true, masked: maskApiKey(key) }
  } catch {
    return { configured: false }
  }
})

ipcMain.handle('api-key-delete', (_, providerId: string) => {
  try {
    if (!providerId) return { success: false, error: 'Invalid provider id' }
    const keys = loadKeys()
    if (keys[providerId]) {
      delete keys[providerId]
      saveKeys(keys)
    }
    return { success: true }
  } catch (err) {
    console.error('[Main] api-key-delete error:', err)
    return { success: false, error: String(err) }
  }
})

// Helper: get decrypted API key for a provider (used by fetch-provider-models)
function getApiKeyForProvider(providerId?: string): string | undefined {
  if (!providerId) return undefined
  const keys = loadKeys()
  const stored = keys[providerId]
  if (!stored) return undefined
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    }
    return Buffer.from(stored, 'base64').toString()
  } catch {
    return undefined
  }
}

// Skills persistence - separate file to avoid race conditions with sessions
ipcMain.handle('skills-load', () => {
  try {
    if (fs.existsSync(SKILLS_FILE)) {
      const raw = fs.readFileSync(SKILLS_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[Main] skills-load error:', err)
  }
  return null
})

ipcMain.handle('skills-save', (_, skills: any[]) => {
  try {
    if (!Array.isArray(skills)) return false
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('[Main] skills-save error:', err)
    return false
  }
})

ipcMain.handle('settings-get', () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[Main] settings-get error:', err)
  }
  return null
})

ipcMain.handle('settings-set', (_, settings: Record<string, unknown>) => {
  try {
    if (!settings || typeof settings !== 'object') return false
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('[Main] settings-set error:', err)
    return false
  }
})

app.on('before-quit', () => {
  stopMimoServe()
  stopAllProcesses()
  for (const proc of terminalProcesses.values()) {
    if (!proc.killed) proc.kill()
  }
  terminalProcesses.clear()
})

ipcMain.handle('mimo-serve-start', async (_, port?: number) => {
  try {
    return await startMimoServe(port)
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('mimo-serve-stop', () => {
  try {
    return stopMimoServe()
  } catch (err) {
    return false
  }
})

ipcMain.handle('mimo-serve-status', () => {
  try {
    return getMimoServeStatus()
  } catch (err) {
    return { status: 'stopped', url: null }
  }
})

let mimoServeOutputSubscription: (() => void) | null = null

ipcMain.handle('mimo-serve-output', () => {
  if (mimoServeOutputSubscription) {
    mimoServeOutputSubscription()
  }
  mimoServeOutputSubscription = onMimoServeOutput((data) => {
    try {
      mainWindow?.webContents.send('mimo-serve-output', data)
    } catch (e) {
      console.error('[Main] Failed to send serve output:', e)
    }
  })
  return { success: true }
})

// Terminal execution
const terminalProcesses = new Map<string, ChildProcess>()

ipcMain.handle('terminal-execute', (_, id: string, command: string, cwd?: string) => {
  try {
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      logOperation('security-block', { command, reason: cwdResult.error! })
      return { success: false, error: cwdResult.error }
    }

    const dangerCheck = isDangerousCommand(command)
    if (dangerCheck.dangerous) {
      logOperation('security-block', { command, reason: dangerCheck.reason! })
      return { success: false, error: `Blocked: ${dangerCheck.reason}` }
    }

    logOperation('terminal-execute', { id, command, cwd: cwdResult.resolved })

    const isWin = process.platform === 'win32'
    const child = spawn(isWin ? 'cmd.exe' : 'bash', isWin ? ['/c', command] : ['-c', command], {
      cwd: cwdResult.resolved,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    terminalProcesses.set(id, child)

    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill()
        terminalProcesses.delete(id)
        mainWindow?.webContents.send('terminal-output', id, '\n[Timeout: process killed after 60s]\n')
      }
    }, 60000)

    child.stdout?.on('data', (data: Buffer) => {
      mainWindow?.webContents.send('terminal-output', id, data.toString())
    })

    child.stderr?.on('data', (data: Buffer) => {
      mainWindow?.webContents.send('terminal-output', id, data.toString())
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      terminalProcesses.delete(id)
      mainWindow?.webContents.send(`terminal-exit-${id}`, id, code)
    })

    child.on('error', (err) => {
      terminalProcesses.delete(id)
      mainWindow?.webContents.send('terminal-output', id, `Error: ${err.message}\n`)
      mainWindow?.webContents.send(`terminal-exit-${id}`, id, 1)
    })

    return { success: true, pid: child.pid }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('terminal-kill', (_, id: string) => {
  const proc = terminalProcesses.get(id)
  if (proc && !proc.killed) {
    proc.kill()
    terminalProcesses.delete(id)
    return true
  }
  return false
})

// Git diff detection
ipcMain.handle('git-diff', async (_, cwd?: string) => {
  try {
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      return { success: false, diff: '', error: cwdResult.error }
    }
    const diff = execFileSync('git', ['diff'], { cwd: cwdResult.resolved, encoding: 'utf-8', timeout: 5000 })
    return { success: true, diff }
  } catch (err) {
    return { success: false, diff: '', error: String(err) }
  }
})

ipcMain.handle('git-file-diff', async (_, file: string, cwd?: string) => {
  try {
    const fileValidation = validateFilePath(file)
    if (!fileValidation.valid) {
      return { success: false, diff: '', error: fileValidation.error }
    }
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      return { success: false, diff: '', error: cwdResult.error }
    }
    const diff = execFileSync('git', ['diff', '--', file], { cwd: cwdResult.resolved, encoding: 'utf-8', timeout: 5000 })
    return { success: true, diff }
  } catch (err) {
    return { success: false, diff: '', error: String(err) }
  }
})

ipcMain.handle('git-diff-stat', async (_, cwd?: string) => {
  try {
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      return { success: false, stat: '', error: cwdResult.error }
    }
    const stat = execFileSync('git', ['diff', '--stat'], { cwd: cwdResult.resolved, encoding: 'utf-8', timeout: 5000 })
    return { success: true, stat }
  } catch (err) {
    return { success: false, stat: '', error: String(err) }
  }
})

ipcMain.handle('git-accept', async (_, file: string, cwd?: string) => {
  try {
    const fileValidation = validateFilePath(file)
    if (!fileValidation.valid) {
      logOperation('security-block', { operation: 'git-accept', file, reason: fileValidation.error! })
      return { success: false, error: fileValidation.error }
    }
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      return { success: false, error: cwdResult.error }
    }
    logOperation('git-accept', { file, cwd: cwdResult.resolved })
    execFileSync('git', ['add', file], { cwd: cwdResult.resolved, timeout: 5000 })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('git-reject', async (_, file: string, cwd?: string) => {
  try {
    const fileValidation = validateFilePath(file)
    if (!fileValidation.valid) {
      logOperation('security-block', { operation: 'git-reject', file, reason: fileValidation.error! })
      return { success: false, error: fileValidation.error }
    }
    const cwdResult = validateCwd(cwd)
    if (!cwdResult.valid) {
      return { success: false, error: cwdResult.error }
    }
    logOperation('git-reject', { file, cwd: cwdResult.resolved })
    execFileSync('git', ['checkout', 'HEAD', '--', file], { cwd: cwdResult.resolved, timeout: 5000 })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('save-file', async (_, content: string, defaultName: string) => {
  try {
    const parentWindow = mainWindow || BrowserWindow.getFocusedWindow() || undefined
    const dialogOptions = {
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    const result = parentWindow
      ? await dialog.showSaveDialog(parentWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  } catch (err) {
    console.error('[Main] save-file error:', err)
    return { success: false, error: String(err) }
  }
})

// File operations
ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const resolved = path.resolve(filePath)
    let realResolved: string
    try {
      realResolved = fs.realpathSync(resolved)
    } catch {
      realResolved = resolved
    }
    const userDataDir = app.getPath('userData')

    // Check against userData dir
    const inUserData = realResolved.startsWith(userDataDir + path.sep) || realResolved === userDataDir

    // Check against authorized workspaces
    let inWorkspace = false
    for (const workspace of getAuthorizedWorkspaces()) {
      if (realResolved.startsWith(workspace + path.sep) || realResolved === workspace) {
        inWorkspace = true
        break
      }
    }

    if (!inUserData && !inWorkspace) {
      return { success: false, error: 'Access denied: path outside allowed directories' }
    }

    if (isSensitiveFile(realResolved)) {
      return { success: false, error: 'Access denied: sensitive file' }
    }

    const content = fs.readFileSync(realResolved, 'utf-8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('open-file', async (_, filters?: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true }
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return { success: true, content, filePath: result.filePaths[0] }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

async function handleOpenDirectory(event?: IpcMainInvokeEvent) {
  try {
    const sourceWindow = event ? BrowserWindow.fromWebContents(event.sender) : null
    const parentWindow = sourceWindow || mainWindow || BrowserWindow.getFocusedWindow()
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow!, {
          title: '选择项目文件夹',
          properties: ['openDirectory', 'createDirectory']
        })
      : await dialog.showOpenDialog({
          title: '选择项目文件夹',
          properties: ['openDirectory', 'createDirectory']
        })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    const dirPath = result.filePaths[0]
    return {
      success: true,
      path: dirPath,
      name: path.basename(dirPath)
    }
  } catch (err) {
    console.error('[Main] open-directory error:', err)
    return { success: false, error: String(err) }
  }
}

ipcMain.handle('open-directory', handleOpenDirectory)
ipcMain.handle('dialog-open-directory', handleOpenDirectory)

ipcMain.handle('fetch-sessions', async () => {
  try {
    return { success: true, sessions: await fetchSessionList() }
  } catch (err) {
    return { success: false, sessions: [], error: String(err) }
  }
})

ipcMain.handle('export-session-data', async (_, sessionId: string) => {
  try {
    const data = await exportSession(sessionId)
    return { success: true, data }
  } catch (err) {
    return { success: false, data: null, error: String(err) }
  }
})

ipcMain.handle('read-project-context', async (_, projectDir: string) => {
  try {
    const memory = readMemoryFiles(projectDir)
    const checkpoints = readCheckpoints(projectDir)
    return { success: true, memory, checkpoints }
  } catch (err) {
    return { success: false, memory: [], checkpoints: [], error: String(err) }
  }
})

ipcMain.handle('window-minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.handle('window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  if (win.isMaximized()) {
    win.unmaximize()
    return false
  }
  win.maximize()
  return true
})

ipcMain.handle('window-close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

app.whenReady().then(() => {
  // Authorize process.cwd() as default workspace for basic CLI functionality
  authorizeWorkspace(process.cwd())
  createWindow()
})

app.on('window-all-closed', () => {
  stopAllProcesses()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Plugin scanning
ipcMain.handle('plugin-list-scan', () => {
  try {
    return { success: true, plugins: scanPluginDirectories() }
  } catch (err) {
    return { success: false, plugins: [], error: String(err) }
  }
})

ipcMain.handle('plugin-install', async (_, module: string) => {
  try {
    const mimoPath = getMimoPath()
    return new Promise((resolve) => {
      const child = spawn(mimoPath, ['plugin', module], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      })
      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
      child.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })
      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ success: true, output: stdout })
        } else {
          resolve({ success: false, error: stderr || stdout || `exit code ${code}` })
        }
      })
      child.on('error', (err: Error) => {
        resolve({ success: false, error: String(err) })
      })
    })
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// MCP server management
ipcMain.handle('mcp-list', () => {
  try {
    return { success: true, servers: loadMcpConfig() }
  } catch (err) {
    return { success: false, servers: [], error: String(err) }
  }
})

ipcMain.handle('mcp-add', (_, server: { name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean }) => {
  try {
    const result = addMcpServer(server)
    return result ? { success: true, server: result } : { success: false, error: 'Failed to add server' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('mcp-update', (_, id: string, updates: Record<string, unknown>) => {
  try {
    const result = updateMcpServer(id, updates)
    return result ? { success: true, server: result } : { success: false, error: 'Failed to update server' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('mcp-remove', (_, id: string) => {
  try {
    return { success: removeMcpServer(id) }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('mcp-toggle', (_, id: string) => {
  try {
    const result = toggleMcpServer(id)
    return result ? { success: true, server: result } : { success: false, error: 'Failed to toggle server' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Skill scanning
ipcMain.handle('skill-list-scan', () => {
  try {
    return { success: true, skills: scanSkillDirectories() }
  } catch (err) {
    return { success: false, skills: [], error: String(err) }
  }
})

ipcMain.handle('skill-install', async (_, module: string) => {
  try {
    const mimoPath = getMimoPath()
    return new Promise((resolve) => {
      const child = spawn(mimoPath, ['skill', module], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      })
      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
      child.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })
      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ success: true, output: stdout })
        } else {
          resolve({ success: false, error: stderr || stdout || `exit code ${code}` })
        }
      })
      child.on('error', (err: Error) => {
        resolve({ success: false, error: String(err) })
      })
    })
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// Multi-window support
ipcMain.handle('open-session-window', async (_, sessionId: string) => {
  const sessionWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    autoHideMenuBar: true,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  sessionWindow.setMenuBarVisibility(false)

  // WebView security: same restrictions as main window (data:text/html not needed)
  sessionWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    const url = params.src || ''
    const appPath = app.getAppPath().replace(/\\/g, '/')

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/.test(url)
    const isAppFile = url.startsWith('file://') && url.slice(7).replace(/\\/g, '/').startsWith(appPath)

    if (!isLocalhost && !isAppFile) {
      event.preventDefault()
      return
    }
    delete webPreferences.nodeIntegration
    delete webPreferences.preload
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
  })

  const distPath = path.join(__dirname, '..', 'dist', 'index.html')
  if (fs.existsSync(distPath)) {
    sessionWindow.loadFile(distPath, { search: `sessionId=${sessionId}` })
  } else {
    sessionWindow.loadURL(`http://localhost:5173?sessionId=${sessionId}`)
  }

  return { success: true }
})
