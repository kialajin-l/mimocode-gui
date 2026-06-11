import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  startSession: (sessionId: string, cwd: string) =>
    ipcRenderer.invoke('start-session', sessionId, cwd),

  sendMessage: (sessionId: string, message: string) =>
    ipcRenderer.invoke('send-message', sessionId, message),

  stopSession: (sessionId: string) =>
    ipcRenderer.invoke('stop-session', sessionId),

  onSessionOutput: (callback: (sessionId: string, data: string) => void) => {
    ipcRenderer.on('session-output', (_, sessionId, data) => callback(sessionId, data))
  },

  onSessionError: (callback: (sessionId: string, data: string) => void) => {
    ipcRenderer.on('session-error', (_, sessionId, data) => callback(sessionId, data))
  },

  onSessionExit: (callback: (sessionId: string, code: number | null) => void) => {
    ipcRenderer.on('session-exit', (_, sessionId, code) => callback(sessionId, code))
  },

  removeSessionListeners: () => {
    ipcRenderer.removeAllListeners('session-output')
    ipcRenderer.removeAllListeners('session-error')
    ipcRenderer.removeAllListeners('session-exit')
  }
})
