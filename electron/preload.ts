import { contextBridge, ipcRenderer } from 'electron'

const chunkListeners = new Map<string, (...args: any[]) => void>()
const terminalListeners = new Map<string, (...args: any[]) => void>()

function safeInvoke(channel: string, ...args: any[]): Promise<any> {
  return ipcRenderer.invoke(channel, ...args).catch((err) => {
    console.error(`[Preload] IPC error on ${channel}:`, err)
    return { success: false, error: String(err) }
  })
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Chat messaging
  sendMessage: (sessionId: string, message: string, cwd?: string, model?: string, permission?: string) =>
    safeInvoke('send-message', sessionId, message, cwd, model, permission),

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

  // Terminal execution
  terminalExecute: (id: string, command: string, cwd?: string) =>
    safeInvoke('terminal-execute', id, command, cwd),

  terminalKill: (id: string) =>
    safeInvoke('terminal-kill', id),

  onTerminalOutput: (id: string, callback: (data: string) => void) => {
    const existing = terminalListeners.get(id)
    if (existing) {
      ipcRenderer.removeListener('terminal-output', existing)
    }
    const listener = (_: any, tid: string, data: string) => {
      if (tid === id) callback(data)
    }
    terminalListeners.set(id, listener)
    ipcRenderer.on('terminal-output', listener)
  },

  onTerminalExit: (id: string, callback: (code: number | null) => void) => {
    const channel = `terminal-exit-${id}`
    const listener = (_: any, tid: string, code: number | null) => {
      if (tid === id) callback(code)
    }
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  removeTerminalListeners: (id: string) => {
    const listener = terminalListeners.get(id)
    if (listener) {
      ipcRenderer.removeListener('terminal-output', listener)
      terminalListeners.delete(id)
    }
  },

  // File save
  saveFile: (content: string, defaultName: string) =>
    safeInvoke('save-file', content, defaultName),

  // Data persistence
  getMimoPath: () => safeInvoke('get-mimo-path'),
  loadData: () => safeInvoke('load-data'),
  saveData: (data: any) => safeInvoke('save-data', data),

  // Git operations
  gitDiff: (cwd?: string) => safeInvoke('git-diff', cwd),
  gitDiffStat: (cwd?: string) => safeInvoke('git-diff-stat', cwd),
  gitAccept: (file: string, cwd?: string) => safeInvoke('git-accept', file, cwd),
  gitReject: (file: string, cwd?: string) => safeInvoke('git-reject', file, cwd),

  // Multi-window
  openSessionWindow: (sessionId: string) => safeInvoke('open-session-window', sessionId)
})
