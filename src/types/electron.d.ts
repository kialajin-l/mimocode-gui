interface ElectronAPI {
  startSession: (sessionId: string, cwd: string) => Promise<{ success: boolean; pid?: number }>
  sendMessage: (sessionId: string, message: string) => Promise<{ success: boolean }>
  stopSession: (sessionId: string) => Promise<{ success: boolean }>
  onSessionOutput: (callback: (sessionId: string, data: string) => void) => void
  onSessionError: (callback: (sessionId: string, data: string) => void) => void
  onSessionExit: (callback: (sessionId: string, code: number | null) => void) => void
  removeSessionListeners: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
