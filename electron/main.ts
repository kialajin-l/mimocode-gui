import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { startCliSession, sendCliMessage, stopCliSession } from './cli-bridge'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('start-session', (_, sessionId: string, cwd: string) => {
  const proc = startCliSession(sessionId, cwd)

  proc.stdout?.on('data', (data: Buffer) => {
    mainWindow?.webContents.send('session-output', sessionId, data.toString())
  })

  proc.stderr?.on('data', (data: Buffer) => {
    mainWindow?.webContents.send('session-error', sessionId, data.toString())
  })

  proc.on('exit', (code) => {
    mainWindow?.webContents.send('session-exit', sessionId, code)
  })

  return { success: true, pid: proc.pid }
})

ipcMain.handle('send-message', (_, sessionId: string, message: string) => {
  sendCliMessage(sessionId, message)
  return { success: true }
})

ipcMain.handle('stop-session', (_, sessionId: string) => {
  stopCliSession(sessionId)
  return { success: true }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
