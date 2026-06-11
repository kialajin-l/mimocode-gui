interface MessageChunk {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'error' | 'metadata'
  content: string
  toolName?: string
  toolArgs?: Record<string, unknown>
}

interface ElectronAPI {
  sendMessage: (sessionId: string, message: string, cwd?: string) => Promise<{
    success: boolean
    content?: string
    error?: string
  }>
  cancelMessage: (sessionId: string) => Promise<boolean>
  onMessageChunk: (sessionId: string, callback: (chunk: MessageChunk) => void) => void
  removeMessageChunkListener: (sessionId: string) => void
  getMimoPath: () => Promise<string>
  loadData: () => Promise<any>
  saveData: (data: any) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
