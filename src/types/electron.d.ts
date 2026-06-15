interface MessageChunk {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'error' | 'metadata'
  content: string
  requestId?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
}

interface ElectronAPI {
  // Chat
  sendMessage: (sessionId: string, message: string, cwd?: string, model?: string, permission?: string, variant?: string, mode?: string) => Promise<{
    success: boolean
    content?: string
    error?: string
  }>
  cancelMessage: (sessionId: string) => Promise<boolean>
  onMessageChunk: (sessionId: string, callback: (chunk: MessageChunk) => void) => void
  removeMessageChunkListener: (sessionId: string) => void

  // Terminal
  terminalExecute: (id: string, command: string, cwd?: string) => Promise<{
    success: boolean
    pid?: number
    error?: string
  }>
  terminalKill: (id: string) => Promise<boolean>
  onTerminalOutput: (id: string, callback: (data: string) => void) => (() => void)
  onTerminalExit: (id: string, callback: (code: number | null) => void) => (() => void)
  removeTerminalListeners: (id: string) => void

  // File
  saveFile: (content: string, defaultName: string) => Promise<{
    success: boolean
    path?: string
    canceled?: boolean
    error?: string
  }>

  // Data
  getMimoPath: () => Promise<string>
  listModels: () => Promise<{ success: boolean; models: string[]; error?: string }>
  listCliProviders: () => Promise<{
    success: boolean
    providers: { id: string; label: string; source: string; baseUrl?: string; models: string[] }[]
    error?: string
  }>
  cliHealth: () => Promise<{ healthy: boolean; path: string; error?: string }>
  loadData: () => Promise<any>
  saveData: (data: any) => Promise<boolean>
  skillsLoad: () => Promise<any[]>
  skillsSave: (skills: any[]) => Promise<boolean>
  fetchProviderModels: (baseUrl: string, apiKey?: string, providerId?: string) => Promise<{ success: boolean; models: string[]; error?: string }>

  // Settings persistence
  getSettings: () => Promise<Record<string, unknown> | null>
  setSettings: (settings: Record<string, unknown>) => Promise<boolean>

  // Git
  gitDiff: (cwd?: string) => Promise<{ success: boolean; diff: string; error?: string }>
  gitDiffStat: (cwd?: string) => Promise<{ success: boolean; stat: string; error?: string }>
  gitFileDiff: (file: string, cwd?: string) => Promise<{ success: boolean; diff: string; error?: string }>
  gitAccept: (file: string, cwd?: string) => Promise<{ success: boolean; error?: string }>
  gitReject: (file: string, cwd?: string) => Promise<{ success: boolean; error?: string }>

  // Multi-window
  openSessionWindow: (sessionId: string) => Promise<{ success: boolean; error?: string }>

  // File operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<{
    success: boolean
    content?: string
    filePath?: string
    canceled?: boolean
    error?: string
  }>
  openDirectory: () => Promise<{
    success: boolean
    path?: string
    name?: string
    canceled?: boolean
    error?: string
  }>

  // Window controls
  windowMinimize: () => Promise<void>
  windowToggleMaximize: () => Promise<boolean>
  windowClose: () => Promise<void>

  // Mimo Serve
  startMimoServe: (port?: number) => Promise<{ success: boolean; url?: string; error?: string }>
  stopMimoServe: () => Promise<boolean>
  getMimoServeStatus: () => Promise<{ status: 'running' | 'stopped' | 'error'; url: string | null }>
  onMimoServeOutput: (callback: (data: { type: string; content: string }) => void) => (() => void)

  // Plugins
  scanPlugins: () => Promise<{
    success: boolean
    plugins: { id: string; name: string; description: string; path: string; source: string; enabled: boolean }[]
    error?: string
  }>
  installPlugin: (module: string) => Promise<{ success: boolean; output?: string; error?: string }>

  // Skills
  scanSkills: () => Promise<{
    success: boolean
    skills: { id: string; name: string; description: string; path: string; source: string; enabled: boolean }[]
    error?: string
  }>
  installSkill: (module: string) => Promise<{ success: boolean; output?: string; error?: string }>

  // MCP
  mcpList: () => Promise<{
    success: boolean
    servers: { id: string; name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean; source?: 'gui' | 'claude'; readonly?: boolean }[]
    error?: string
  }>
  mcpAdd: (server: { name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean }) => Promise<{
    success: boolean
    server?: { id: string; name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean; source?: 'gui' | 'claude'; readonly?: boolean }
    error?: string
  }>
  mcpUpdate: (id: string, updates: Record<string, unknown>) => Promise<{
    success: boolean
    server?: { id: string; name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean; source?: 'gui' | 'claude'; readonly?: boolean }
    error?: string
  }>
  mcpRemove: (id: string) => Promise<{ success: boolean; error?: string }>
  mcpToggle: (id: string) => Promise<{
    success: boolean
    server?: { id: string; name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean; source?: 'gui' | 'claude'; readonly?: boolean }
    error?: string
  }>

  // Inspector / data adapters
  fetchSessions: () => Promise<{ success: boolean; sessions: any[]; error?: string }>
  exportSessionData: (sessionId: string) => Promise<{ success: boolean; data: any; error?: string }>
  readProjectContext: (projectDir: string) => Promise<{
    success: boolean
    memory: { name: string; path: string; content: string; mtime: number }[]
    checkpoints: { name: string; path: string; content: string; mtime: number }[]
    error?: string
  }>
  syncWorkspaces: (cwds: string[]) => Promise<{ success: boolean }>

  // API Key secure storage
  apiKeySave: (providerId: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  apiKeyGetStatus: (providerId: string) => Promise<{ configured: boolean; masked?: string; error?: string }>
  apiKeyDelete: (providerId: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
