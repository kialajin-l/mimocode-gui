import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, execFileSync, ChildProcess } from 'child_process'
import { sendMessage, cancelMessage, getMimoPath, listModels, stopAllProcesses } from './cli-bridge'
import { startMimoServe, stopMimoServe, getMimoServeStatus, onMimoServeOutput } from './mimo-process'
import { fetchSessionList, exportSession } from './cli-data-adapter'
import { readMemoryFiles, readCheckpoints } from './local-data-adapter'
import {
  validateFilePath, validateCwd, isSensitiveFile,
  isDangerousCommand, logOperation
} from './security-ipc'
import { scanPluginDirectories } from './plugin-scanner'

const DATA_DIR = app.getPath('userData')
const DATA_FILE = path.join(DATA_DIR, 'sessions.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('[Main] Unhandled rejection:', err)
})

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
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
}

ipcMain.handle('send-message', async (_, sessionId: string, message: string, cwd?: string, model?: string, permission?: string, variant?: string, requestId?: string) => {
  try {
    return await new Promise((resolve) => {
      sendMessage(message, {
        sessionId,
        cwd,
        model,
        variant,
        permission,
        onChunk: (chunk) => {
          try {
            mainWindow?.webContents.send('message-chunk', sessionId, { ...chunk, requestId })
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
    // Basic schema validation
    if (!data || typeof data !== 'object') return false
    if (data.sessions && !Array.isArray(data.sessions)) return false
    if (data.projects && !Array.isArray(data.projects)) return false
    if (data.activeSessionId !== null && data.activeSessionId !== undefined && typeof data.activeSessionId !== 'string') return false

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

ipcMain.handle('mimo-serve-output', () => {
  const unsubscribe = onMimoServeOutput((data) => {
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
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
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
    const userDataDir = app.getPath('userData')
    const projectDir = process.cwd()
    
    // Check containment with path separator to prevent prefix matching
    const inUserData = resolved.startsWith(userDataDir + path.sep) || resolved === userDataDir
    const inProject = resolved.startsWith(projectDir + path.sep) || resolved === projectDir
    
    if (!inUserData && !inProject) {
      return { success: false, error: 'Access denied: path outside allowed directories' }
    }

    if (isSensitiveFile(resolved)) {
      return { success: false, error: 'Access denied: sensitive file' }
    }

    const content = fs.readFileSync(resolved, 'utf-8')
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

app.whenReady().then(createWindow)

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

// Multi-window support
ipcMain.handle('open-session-window', async (_, sessionId: string) => {
  const sessionWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  sessionWindow.setMenuBarVisibility(false)

  const distPath = path.join(__dirname, '..', 'dist', 'index.html')
  if (fs.existsSync(distPath)) {
    sessionWindow.loadFile(distPath, { search: `sessionId=${sessionId}` })
  } else {
    sessionWindow.loadURL(`http://localhost:5173?sessionId=${sessionId}`)
  }

  return { success: true }
})
