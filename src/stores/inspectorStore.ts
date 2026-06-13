import { create } from 'zustand'

interface MemoryFile {
  name: string
  path: string
  content: string
  mtime: number
}

interface CheckpointFile {
  name: string
  path: string
  content: string
  mtime: number
}

interface SessionEntry {
  id: string
  name?: string
  path?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}

interface InspectorState {
  sessions: SessionEntry[]
  sessionsLoading: boolean
  currentSessionDetail: any | null
  detailLoading: boolean
  memory: MemoryFile[]
  checkpoints: CheckpointFile[]
  contextLoading: boolean

  fetchSessions: () => Promise<void>
  exportSessionDetail: (sessionId: string) => Promise<void>
  readProjectContext: (projectDir: string) => Promise<void>
  clearSessionDetail: () => void
}

export const useInspectorStore = create<InspectorState>((set) => ({
  sessions: [],
  sessionsLoading: false,
  currentSessionDetail: null,
  detailLoading: false,
  memory: [],
  checkpoints: [],
  contextLoading: false,

  fetchSessions: async () => {
    const api = window.electronAPI
    if (!api) return
    set({ sessionsLoading: true })
    try {
      const result = await api.fetchSessions()
      set({
        sessions: result.success ? result.sessions : [],
        sessionsLoading: false
      })
    } catch (err) {
      console.error('[InspectorStore] fetchSessions error:', err)
      set({ sessions: [], sessionsLoading: false })
    }
  },

  exportSessionDetail: async (sessionId: string) => {
    const api = window.electronAPI
    if (!api) return
    set({ detailLoading: true, currentSessionDetail: null })
    try {
      const result = await api.exportSessionData(sessionId)
      set({
        currentSessionDetail: result.success ? result.data : null,
        detailLoading: false
      })
    } catch (err) {
      console.error('[InspectorStore] exportSessionDetail error:', err)
      set({ currentSessionDetail: null, detailLoading: false })
    }
  },

  readProjectContext: async (projectDir: string) => {
    const api = window.electronAPI
    if (!api) return
    set({ contextLoading: true })
    try {
      const result = await api.readProjectContext(projectDir)
      set({
        memory: result.success ? result.memory : [],
        checkpoints: result.success ? result.checkpoints : [],
        contextLoading: false
      })
    } catch (err) {
      console.error('[InspectorStore] readProjectContext error:', err)
      set({ memory: [], checkpoints: [], contextLoading: false })
    }
  },

  clearSessionDetail: () => {
    set({ currentSessionDetail: null })
  }
}))
