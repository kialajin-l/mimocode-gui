import { contextBridge, ipcRenderer } from 'electron'

const chunkListeners = new Map<string, (...args: any[]) => void>()

function safeInvoke(channel: string, ...args: any[]): Promise<any> {
  return ipcRenderer.invoke(channel, ...args).catch((err) => {
    console.error(`[Preload] IPC error on ${channel}:`, err)
    return { success: false, error: String(err) }
  })
}

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (sessionId: string, message: string, cwd?: string) =>
    safeInvoke('send-message', sessionId, message, cwd),

  cancelMessage: (sessionId: string) =>
    safeInvoke('cancel-message', sessionId),

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

  getMimoPath: () => safeInvoke('get-mimo-path'),
  loadData: () => safeInvoke('load-data'),
  saveData: (data: any) => safeInvoke('save-data', data)
})
