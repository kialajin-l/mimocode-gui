import { create } from 'zustand'

export interface Plugin {
  id: string
  name: string
  description: string
  enabled: boolean
  path: string
}

interface PluginState {
  plugins: Plugin[]
  loaded: boolean
  loadPlugins: () => Promise<void>
  togglePlugin: (id: string) => void
  addPlugin: (plugin: Omit<Plugin, 'enabled'>) => void
  removePlugin: (id: string) => void
}

let pluginSaveTimer: ReturnType<typeof setTimeout> | null = null

function schedulePluginSave(plugins: Plugin[]) {
  if (pluginSaveTimer) clearTimeout(pluginSaveTimer)
  pluginSaveTimer = setTimeout(async () => {
    const api = window.electronAPI
    if (api) {
      // Read existing data first to merge
      try {
        const existing = await api.loadData()
        const merged = { ...existing, plugins }
        await api.saveData(merged)
      } catch (err) {
        console.error('[PluginStore] save error:', err)
      }
    }
  }, 500)
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  loaded: false,

  loadPlugins: async () => {
    if (get().loaded) return
    const api = window.electronAPI
    if (api) {
      try {
        const data = await api.loadData()
        if (data?.plugins) {
          set({ plugins: data.plugins, loaded: true })
          return
        }
      } catch (err) {
        console.error('[PluginStore] loadPlugins error:', err)
      }
    }
    set({ loaded: true })
  },

  togglePlugin: (id) => {
    set((state) => ({
      plugins: state.plugins.map(p =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      )
    }))
    schedulePluginSave(get().plugins)
  },

  addPlugin: (plugin) => {
    const newPlugin: Plugin = { ...plugin, enabled: true }
    set((state) => ({ plugins: [...state.plugins, newPlugin] }))
    schedulePluginSave(get().plugins)
  },

  removePlugin: (id) => {
    set((state) => ({
      plugins: state.plugins.filter(p => p.id !== id)
    }))
    schedulePluginSave(get().plugins)
  }
}))
