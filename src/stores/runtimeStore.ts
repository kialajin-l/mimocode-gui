import { create } from 'zustand'

interface RuntimeState {
  serveStatus: 'running' | 'stopped' | 'error' | 'starting'
  serveUrl: string | null
  outputLogs: Array<{ type: 'stdout' | 'stderr'; content: string; timestamp: number }>
  setServeStatus: (status: 'running' | 'stopped' | 'error') => void
  setServeUrl: (url: string | null) => void
  addOutputLog: (type: 'stdout' | 'stderr', content: string) => void
  clearOutputLogs: () => void
  startServe: (port?: number) => Promise<void>
  stopServe: () => Promise<void>
  syncServeStatus: () => Promise<void>
}

let outputUnsubscribe: (() => void) | null = null

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  serveStatus: 'stopped',
  serveUrl: null,
  outputLogs: [],

  setServeStatus: (status) => set({ serveStatus: status }),

  setServeUrl: (url) => set({ serveUrl: url }),

  addOutputLog: (type, content) => set((state) => ({
    outputLogs: [...state.outputLogs.slice(-999), { type, content, timestamp: Date.now() }]
  })),

  clearOutputLogs: () => set({ outputLogs: [] }),

  startServe: async (port?: number) => {
    const api = (window as any).electronAPI
    if (!api) return

    set({ serveStatus: 'starting' })

    // Remove previous listener before registering new one
    if (outputUnsubscribe) {
      outputUnsubscribe()
      outputUnsubscribe = null
    }

    const cleanup = api.onMimoServeOutput((data: { type: string; content: string }) => {
      get().addOutputLog(data.type as 'stdout' | 'stderr', data.content)
    })
    outputUnsubscribe = cleanup || null

    const result = await api.startMimoServe(port)
    if (result?.success && result.url) {
      set({ serveStatus: 'running', serveUrl: result.url })
    } else {
      set({ serveStatus: 'error' })
    }
  },

  stopServe: async () => {
    const api = (window as any).electronAPI
    if (!api) return

    // Clean up listener
    if (outputUnsubscribe) {
      outputUnsubscribe()
      outputUnsubscribe = null
    }

    await api.stopMimoServe()
    set({ serveStatus: 'stopped', serveUrl: null })
  },

  syncServeStatus: async () => {
    const api = (window as any).electronAPI
    if (!api) return

    const status = await api.getMimoServeStatus()
    if (status) {
      set({ serveStatus: status.status, serveUrl: status.url })
    }
  },
}))
