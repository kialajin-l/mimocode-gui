import { contextBridge, ipcRenderer } from 'electron'

const chunkListeners = new Map<string, (...args: any[]) => void>()

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (sessionId: string, message: string, cwd?: string) => 
    ipcRenderer.invoke('send-message', sessionId, message, cwd),
  
  cancelMessage: (sessionId: string) => 
    ipcRenderer.invoke('cancel-message', sessionId),
  
  onMessageChunk: (sessionId: string, callback: (chunk: any) => void) => {
    const existing = chunkListeners.get(sessionId)
    if (existing) {
      ipcRenderer.removeListener('message-chunk', existing)
    }
    const listener = (_: any, sid: string, chunk: any) => {
      if (sid === sessionId) callback(chunk)
    }
    chunkListeners.set(sessionId, listener)
    ipcRenderer.on('message-chunk', listener)
  },
  
  removeMessageChunkListener: (sessionId: string) => {
    const listener = chunkListeners.get(sessionId)
    if (listener) {
      ipcRenderer.removeListener('message-chunk', listener)
      chunkListeners.delete(sessionId)
    }
  },
  
  getMimoPath: () => ipcRenderer.invoke('get-mimo-path')
})
