import { create } from 'zustand'

export interface Plugin {
  id: string
  name: string
  description: string
  enabled: boolean
  path: string
  source?: 'registered' | 'discovered'
}

interface ScannedPlugin {
  id: string
  name: string
  description: string
  path: string
  source: string
  enabled: boolean
}

interface PluginState {
  plugins: Plugin[]
  loaded: boolean
  scanning: boolean
  loadPlugins: () => Promise<void>
  scanPlugins: () => Promise<void>
  installPlugin: (module: string) => Promise<{ success: boolean; error?: string }>
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
      try {
        const existing = await api.loadData()
        const registered = plugins.filter(p => p.source !== 'discovered')
        const merged = { ...existing, plugins: registered }
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
  scanning: false,

  loadPlugins: async () => {
    if (get().loaded) return
    const api = window.electronAPI
    if (api) {
      try {
        const data = await api.loadData()
        if (data?.plugins) {
          set({
            plugins: data.plugins.map((p: Plugin) => ({ ...p, source: 'registered' as const })),
            loaded: true,
          })
          return
        }
      } catch (err) {
        console.error('[PluginStore] loadPlugins error:', err)
      }
    }
    set({ loaded: true })
  },

  scanPlugins: async () => {
    const api = window.electronAPI
    if (!api) return
    set({ scanning: true })
    try {
      const result = await api.scanPlugins()
      if (result?.success && Array.isArray(result.plugins)) {
        const discovered: Plugin[] = result.plugins.map((p: ScannedPlugin) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          path: p.path,
          enabled: p.enabled,
          source: 'discovered' as const,
        }))
        set((state) => {
          const registeredIds = new Set(state.plugins.filter(p => p.source === 'registered').map(p => p.id))
          const newDiscovered = discovered.filter(p => !registeredIds.has(p.id))
          return { plugins: [...state.plugins.filter(p => p.source === 'registered'), ...newDiscovered] }
        })
      }
    } catch (err) {
      console.error('[PluginStore] scanPlugins error:', err)
    } finally {
      set({ scanning: false })
    }
  },

  installPlugin: async (module: string) => {
    const api = window.electronAPI
    if (!api) return { success: false, error: 'No electron API' }
    try {
      const result = await api.installPlugin(module)
      if (result?.success) {
        await get().scanPlugins()
      }
      return { success: result?.success ?? false, error: result?.error }
    } catch (err) {
      return { success: false, error: String(err) }
    }
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
    const newPlugin: Plugin = { ...plugin, enabled: true, source: 'registered' }
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
