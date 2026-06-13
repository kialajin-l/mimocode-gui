import { create } from 'zustand'

interface RuntimeState {
  serveStatus: 'running' | 'stopped' | 'error'
  serveUrl: string | null
  outputLogs: Array<{ type: 'stdout' | 'stderr'; content: string; timestamp: number }>
  setServeStatus: (status: 'running' | 'stopped' | 'error') => void
  setServeUrl: (url: string | null) => void
  addOutputLog: (type: 'stdout' | 'stderr', content: string) => void
  clearOutputLogs: () => void
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  serveStatus: 'stopped',
  serveUrl: null,
  outputLogs: [],

  setServeStatus: (status) => set({ serveStatus: status }),

  setServeUrl: (url) => set({ serveUrl: url }),

  addOutputLog: (type, content) => set((state) => ({
    outputLogs: [...state.outputLogs.slice(-999), { type, content, timestamp: Date.now() }]
  })),

  clearOutputLogs: () => set({ outputLogs: [] }),
}))
