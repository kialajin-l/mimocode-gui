import { create } from 'zustand'

interface SettingsState {
  defaultModel: string
  defaultReasoning: string
  defaultPermission: string
  showStatusCard: boolean
  setDefaultModel: (model: string) => void
  setDefaultReasoning: (reasoning: string) => void
  setDefaultPermission: (permission: string) => void
  setShowStatusCard: (show: boolean) => void
}

function loadSetting<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const saved = localStorage.getItem(`mimocode-setting-${key}`)
  if (saved === null) return fallback
  try {
    return JSON.parse(saved) as T
  } catch {
    return saved as T
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultModel: loadSetting('defaultModel', 'auto'),
  defaultReasoning: loadSetting('defaultReasoning', 'medium'),
  defaultPermission: loadSetting('defaultPermission', 'ask'),
  showStatusCard: loadSetting('showStatusCard', true),

  setDefaultModel: (model) => {
    localStorage.setItem('mimocode-setting-defaultModel', JSON.stringify(model))
    set({ defaultModel: model })
  },

  setDefaultReasoning: (reasoning) => {
    localStorage.setItem('mimocode-setting-defaultReasoning', JSON.stringify(reasoning))
    set({ defaultReasoning: reasoning })
  },

  setDefaultPermission: (permission) => {
    localStorage.setItem('mimocode-setting-defaultPermission', JSON.stringify(permission))
    set({ defaultPermission: permission })
  },

  setShowStatusCard: (show) => {
    localStorage.setItem('mimocode-setting-showStatusCard', JSON.stringify(show))
    set({ showStatusCard: show })
  },
}))
