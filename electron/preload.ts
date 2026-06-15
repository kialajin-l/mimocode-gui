import { contextBridge, ipcRenderer } from 'electron'

const chunkListeners = new Map<string, (...args: any[]) => void>()
const terminalListeners = new Map<string, (...args: any[]) => void>()

const ALLOWED_CHANNELS = new Set([
  'send-message',
  'cancel-message',
  'terminal-execute',
  'terminal-kill',
  'save-file',
  'get-mimo-path',
  'list-models',
  'list-cli-providers',
  'cli-health',
  'load-data',
  'save-data',
  'skills-load',
  'skills-save',
  'fetch-provider-models',
  'settings-get',
  'settings-set',
  'git-diff',
  'git-diff-stat',
  'git-file-diff',
  'git-accept',
  'git-reject',
  'open-session-window',
  'read-file',
  'open-file',
  'open-directory',
  'dialog-open-directory',
  'window-minimize',
  'window-toggle-maximize',
  'window-close',
  'mimo-serve-start',
  'mimo-serve-stop',
  'mimo-serve-status',
  'plugin-list-scan',
  'plugin-install',
  'skill-list-scan',
  'skill-install',
  'mcp-list',
  'mcp-add',
  'mcp-update',
  'mcp-remove',
  'mcp-toggle',
  'fetch-sessions',
  'export-session-data',
  'read-project-context',
  'sync-workspaces',
  'api-key-save',
  'api-key-get-status',
  'api-key-delete',
])

function safeInvoke(channel: string, ...args: any[]): Promise<any> {
  if (!ALLOWED_CHANNELS.has(channel)) {
    console.warn(`[Preload] Blocked unknown IPC channel: ${channel}`)
    return Promise.resolve({ success: false, error: `Blocked unknown channel: ${channel}` })
  }
  return ipcRenderer.invoke(channel, ...args).catch((err) => {
    console.error(`[Preload] IPC error on ${channel}:`, err)
    return { success: false, error: String(err) }
  })
}

const ALLOWED_RECEIVE_CHANNELS = new Set([
  'message-chunk',
  'terminal-output',
  'mimo-serve-output',
])

function safeOn(channel: string, listener: (...args: any[]) => void) {
  if (!ALLOWED_RECEIVE_CHANNELS.has(channel) && !channel.startsWith('terminal-exit-')) {
    console.warn(`[Preload] Blocked unknown receive channel: ${channel}`)
    return
  }
  ipcRenderer.on(channel, listener)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Chat messaging
  sendMessage: (sessionId: string, message: string, cwd?: string, model?: string, permission?: string, variant?: string, mode?: string) =>
    safeInvoke('send-message', sessionId, message, cwd, model, permission, variant, mode),

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
    safeOn('message-chunk', listener)
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
    safeOn('terminal-output', listener)
    return () => {
      ipcRenderer.removeListener('terminal-output', listener)
      terminalListeners.delete(id)
    }
  },

  onTerminalExit: (id: string, callback: (code: number | null) => void) => {
    const channel = `terminal-exit-${id}`
    const listener = (_: any, tid: string, code: number | null) => {
      if (tid === id) callback(code)
    }
    safeOn(channel, listener)
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
  listModels: () => safeInvoke('list-models'),
  listCliProviders: () => safeInvoke('list-cli-providers'),
  cliHealth: () => safeInvoke('cli-health'),
  loadData: () => safeInvoke('load-data'),
  saveData: (data: any) => safeInvoke('save-data', data),
  skillsLoad: () => safeInvoke('skills-load'),
  skillsSave: (skills: any[]) => safeInvoke('skills-save', skills),
  fetchProviderModels: (baseUrl: string, apiKey?: string, providerId?: string) => safeInvoke('fetch-provider-models', baseUrl, apiKey, providerId),

  // Settings persistence
  getSettings: () => safeInvoke('settings-get'),
  setSettings: (settings: Record<string, unknown>) => safeInvoke('settings-set', settings),

  // Git operations
  gitDiff: (cwd?: string) => safeInvoke('git-diff', cwd),
  gitDiffStat: (cwd?: string) => safeInvoke('git-diff-stat', cwd),
  gitFileDiff: (file: string, cwd?: string) => safeInvoke('git-file-diff', file, cwd),
  gitAccept: (file: string, cwd?: string) => safeInvoke('git-accept', file, cwd),
  gitReject: (file: string, cwd?: string) => safeInvoke('git-reject', file, cwd),

  // Multi-window
  openSessionWindow: (sessionId: string) => safeInvoke('open-session-window', sessionId),

  // File operations
  readFile: (filePath: string) => safeInvoke('read-file', filePath),
  openFile: (filters?: { name: string; extensions: string[] }[]) => safeInvoke('open-file', filters),
  openDirectory: async () => {
    const result = await safeInvoke('open-directory')
    if (result?.success || !String(result?.error || '').includes('No handler registered')) return result
    return safeInvoke('dialog-open-directory')
  },

  // Window controls
  windowMinimize: () => safeInvoke('window-minimize'),
  windowToggleMaximize: () => safeInvoke('window-toggle-maximize'),
  windowClose: () => safeInvoke('window-close'),

  // Mimo Serve
  startMimoServe: (port?: number) => safeInvoke('mimo-serve-start', port),
  stopMimoServe: () => safeInvoke('mimo-serve-stop'),
  getMimoServeStatus: () => safeInvoke('mimo-serve-status'),
  onMimoServeOutput: (callback: (data: { type: string; content: string }) => void) => {
    const listener = (_: any, data: { type: string; content: string }) => {
      callback(data)
    }
    safeOn('mimo-serve-output', listener)
    return () => ipcRenderer.removeListener('mimo-serve-output', listener)
  },

  // Plugins
  scanPlugins: () => safeInvoke('plugin-list-scan'),
  installPlugin: (module: string) => safeInvoke('plugin-install', module),

  // Skills
  scanSkills: () => safeInvoke('skill-list-scan'),
  installSkill: (module: string) => safeInvoke('skill-install', module),

  // MCP
  mcpList: () => safeInvoke('mcp-list'),
  mcpAdd: (server: { name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean }) =>
    safeInvoke('mcp-add', server),
  mcpUpdate: (id: string, updates: Record<string, unknown>) => safeInvoke('mcp-update', id, updates),
  mcpRemove: (id: string) => safeInvoke('mcp-remove', id),
  mcpToggle: (id: string) => safeInvoke('mcp-toggle', id),

  // Inspector / data adapters
  fetchSessions: () => safeInvoke('fetch-sessions'),
  exportSessionData: (sessionId: string) => safeInvoke('export-session-data', sessionId),
  readProjectContext: (projectDir: string) => safeInvoke('read-project-context', projectDir),
  syncWorkspaces: (cwds: string[]) => safeInvoke('sync-workspaces', cwds),

  // API Key secure storage
  apiKeySave: (providerId: string, apiKey: string) => safeInvoke('api-key-save', providerId, apiKey),
  apiKeyGetStatus: (providerId: string) => safeInvoke('api-key-get-status', providerId),
  apiKeyDelete: (providerId: string) => safeInvoke('api-key-delete', providerId),
})
