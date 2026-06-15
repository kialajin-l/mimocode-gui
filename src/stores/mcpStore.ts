import { create } from 'zustand'

export interface McpServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  enabled: boolean
  source?: 'gui' | 'claude'
  readonly?: boolean
}

interface McpState {
  servers: McpServer[]
  loaded: boolean
  loading: boolean
  loadServers: () => Promise<void>
  addServer: (server: Omit<McpServer, 'id'>) => Promise<boolean>
  updateServer: (id: string, updates: Partial<Omit<McpServer, 'id'>>) => Promise<boolean>
  removeServer: (id: string) => Promise<boolean>
  toggleServer: (id: string) => Promise<boolean>
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  loaded: false,
  loading: false,

  loadServers: async () => {
    if (get().loaded) return
    set({ loading: true })
    try {
      const api = window.electronAPI
      if (api?.mcpList) {
        const result = await api.mcpList()
        if (result?.success && Array.isArray(result.servers)) {
          set({ servers: result.servers, loaded: true })
          return
        }
      }
    } catch (err) {
      console.error('[McpStore] loadServers error:', err)
    }
    set({ loaded: true, loading: false })
  },

  addServer: async (server) => {
    const api = window.electronAPI
    if (!api?.mcpAdd) return false
    try {
      const result = await api.mcpAdd(server)
      if (result?.success) {
        await get().loadServers()
        // Force reload by resetting loaded flag
        set({ loaded: false })
        await get().loadServers()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  updateServer: async (id, updates) => {
    const api = window.electronAPI
    if (!api?.mcpUpdate) return false
    try {
      const result = await api.mcpUpdate(id, updates)
      if (result?.success) {
        set({ loaded: false })
        await get().loadServers()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  removeServer: async (id) => {
    const api = window.electronAPI
    if (!api?.mcpRemove) return false
    try {
      const result = await api.mcpRemove(id)
      if (result?.success) {
        set({ loaded: false })
        await get().loadServers()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  toggleServer: async (id) => {
    const api = window.electronAPI
    if (!api?.mcpToggle) return false
    try {
      const result = await api.mcpToggle(id)
      if (result?.success) {
        set({ loaded: false })
        await get().loadServers()
        return true
      }
      return false
    } catch {
      return false
    }
  },
}))
