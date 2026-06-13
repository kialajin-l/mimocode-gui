import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, execFileSync, ChildProcess } from 'child_process'
import { sendMessage, cancelMessage, getMimoPath, stopAllProcesses } from './cli-bridge'
import { startMimoServe, stopMimoServe, getMimoServeStatus, onMimoServeOutput } from './mimo-process'

const DATA_DIR = app.getPath('userData')
const DATA_FILE = path.join(DATA_DIR, 'sessions.json')

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

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

ipcMain.handle('send-message', async (_, sessionId: string, message: string, cwd?: string, model?: string, permission?: string) => {
  try {
    return await new Promise((resolve) => {
      sendMessage(message, {
        sessionId,
        cwd,
        model,
        permission,
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

// Dangerous commands that require confirmation
const DANGEROUS_COMMANDS = ['rm -rf', 'rmdir /s', 'del /f', 'format', 'mkfs', '> /dev/sda']

ipcMain.handle('terminal-execute', (_, id: string, command: string, cwd?: string) => {
  try {
    // Validate cwd - must be a relative path or within allowed directories
    const resolvedCwd = cwd || process.cwd()
    if (cwd && path.isAbsolute(cwd) && !cwd.startsWith(process.cwd())) {
      return { success: false, error: 'Access denied: cwd outside project directory' }
    }

    // Check for dangerous commands
    const lowerCmd = command.toLowerCase()
    if (DANGEROUS_COMMANDS.some(d => lowerCmd.includes(d))) {
      return { success: false, error: 'Blocked: potentially dangerous command' }
    }

    const isWin = process.platform === 'win32'
    const child = spawn(isWin ? 'cmd.exe' : 'bash', isWin ? ['/c', command] : ['-c', command], {
      cwd: resolvedCwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    terminalProcesses.set(id, child)

    // Auto-kill after 60 seconds
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
    const dir = cwd || process.cwd()
    const diff = execFileSync('git', ['diff'], { cwd: dir, encoding: 'utf-8', timeout: 5000 })
    return { success: true, diff }
  } catch (err) {
    return { success: false, diff: '', error: String(err) }
  }
})

ipcMain.handle('git-diff-stat', async (_, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const stat = execFileSync('git', ['diff', '--stat'], { cwd: dir, encoding: 'utf-8', timeout: 5000 })
    return { success: true, stat }
  } catch (err) {
    return { success: false, stat: '', error: String(err) }
  }
})

// Path validation helper for git operations
function validateGitPath(file: string, cwd?: string): { valid: boolean; error?: string } {
  // Reject absolute paths
  if (path.isAbsolute(file)) {
    return { valid: false, error: 'Absolute paths not allowed' }
  }
  // Reject path traversal
  if (file.includes('..')) {
    return { valid: false, error: 'Path traversal not allowed' }
  }
  // Reject empty or very long paths
  if (!file || file.length > 500) {
    return { valid: false, error: 'Invalid file path' }
  }
  return { valid: true }
}

ipcMain.handle('git-accept', async (_, file: string, cwd?: string) => {
  try {
    const validation = validateGitPath(file, cwd)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    const dir = cwd || process.cwd()
    execFileSync('git', ['add', file], { cwd: dir, timeout: 5000 })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('git-reject', async (_, file: string, cwd?: string) => {
  try {
    const validation = validateGitPath(file, cwd)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    const dir = cwd || process.cwd()
    execFileSync('git', ['checkout', 'HEAD', '--', file], { cwd: dir, timeout: 5000 })
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
    // Path validation - only allow reading from user data directory or current project
    const resolved = path.resolve(filePath)
    const userDataDir = app.getPath('userData')
    const projectDir = process.cwd()
    
    if (!resolved.startsWith(userDataDir) && !resolved.startsWith(projectDir)) {
      return { success: false, error: 'Access denied: path outside allowed directories' }
    }

    // Reject sensitive files
    const basename = path.basename(resolved).toLowerCase()
    const sensitivePatterns = ['.env', 'credentials', 'secret', 'password', 'token', '.key', '.pem']
    if (sensitivePatterns.some(p => basename.includes(p))) {
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

// Multi-window support
ipcMain.handle('open-session-window', async (_, sessionId: string) => {
  const sessionWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const distPath = path.join(__dirname, '..', 'dist', 'index.html')
  if (fs.existsSync(distPath)) {
    sessionWindow.loadFile(distPath, { search: `sessionId=${sessionId}` })
  } else {
    sessionWindow.loadURL(`http://localhost:5173?sessionId=${sessionId}`)
  }

  return { success: true }
})
