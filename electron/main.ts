import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { sendMessage, cancelMessage, getMimoPath, stopAllProcesses } from './cli-bridge'

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

ipcMain.handle('send-message', async (_, sessionId: string, message: string, cwd?: string) => {
  try {
    return await new Promise((resolve) => {
      sendMessage(message, {
        sessionId,
        cwd,
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
  stopAllProcesses()
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
