import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { sendMessage, cancelMessage, getMimoPath, stopAllProcesses } from './cli-bridge'

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
}

// IPC handlers
ipcMain.handle('send-message', async (_, sessionId: string, message: string, cwd?: string) => {
  return new Promise((resolve) => {
    sendMessage(message, {
      sessionId,
      cwd,
      onChunk: (chunk) => {
        mainWindow?.webContents.send('message-chunk', sessionId, chunk)
      },
      onComplete: (text) => {
        resolve({ success: true, content: text })
      },
      onError: (error) => {
        resolve({ success: false, error })
      }
    })
  })
})

ipcMain.handle('cancel-message', (_, sessionId: string) => {
  return cancelMessage(sessionId)
})

ipcMain.handle('get-mimo-path', () => getMimoPath())

// Cleanup on exit
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
