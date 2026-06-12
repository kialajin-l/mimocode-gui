interface MessageChunk {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'error' | 'metadata'
  content: string
  toolName?: string
  toolArgs?: Record<string, unknown>
}

interface ElectronAPI {
  // Chat
  sendMessage: (sessionId: string, message: string, cwd?: string) => Promise<{
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
  onTerminalOutput: (id: string, callback: (data: string) => void) => void
  onTerminalExit: (id: string, callback: (code: number | null) => void) => (() => void)
  removeTerminalListeners: (id: string) => void

  // Data
  getMimoPath: () => Promise<string>
  loadData: () => Promise<any>
  saveData: (data: any) => Promise<boolean>

  // Git
  gitDiff: (cwd?: string) => Promise<{ success: boolean; diff: string; error?: string }>
  gitDiffStat: (cwd?: string) => Promise<{ success: boolean; stat: string; error?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
