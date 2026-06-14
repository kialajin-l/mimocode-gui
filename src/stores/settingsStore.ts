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

function loadSettingFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const saved = localStorage.getItem(`mimocode-setting-${key}`)
  if (saved === null) return fallback
  try {
    return JSON.parse(saved) as T
  } catch {
    return saved as T
  }
}

function saveToLocalStorage(key: string, value: unknown) {
  localStorage.setItem(`mimocode-setting-${key}`, JSON.stringify(value))
}

async function loadAllSettings(): Promise<Record<string, unknown> | null> {
  const api = window.electronAPI
  if (!api?.getSettings) return null
  try {
    return await api.getSettings()
  } catch {
    return null
  }
}

async function saveAllSettings(settings: Record<string, unknown>): Promise<void> {
  const api = window.electronAPI
  if (!api?.setSettings) return
  try {
    await api.setSettings(settings)
  } catch {
    // silently fall back to localStorage only
  }
}

let initialized = false
let currentSettings: Record<string, unknown> = {}

async function initializeStore(set: (partial: Partial<SettingsState>) => void) {
  if (initialized) return
  initialized = true

  const persisted = await loadAllSettings()
  if (persisted && Object.keys(persisted).length > 0) {
    currentSettings = persisted
    set({
      defaultModel: (persisted.defaultModel as string) ?? loadSettingFromLocalStorage('defaultModel', 'auto'),
      defaultReasoning: (persisted.defaultReasoning as string) ?? loadSettingFromLocalStorage('defaultReasoning', 'medium'),
      defaultPermission: (persisted.defaultPermission as string) ?? loadSettingFromLocalStorage('defaultPermission', 'ask'),
      showStatusCard: (persisted.showStatusCard as boolean) ?? loadSettingFromLocalStorage('showStatusCard', true),
    })
  } else {
    // No IPC settings yet — load from localStorage and persist to IPC
    currentSettings = {
      defaultModel: loadSettingFromLocalStorage('defaultModel', 'auto'),
      defaultReasoning: loadSettingFromLocalStorage('defaultReasoning', 'medium'),
      defaultPermission: loadSettingFromLocalStorage('defaultPermission', 'ask'),
      showStatusCard: loadSettingFromLocalStorage('showStatusCard', true),
    }
    set(currentSettings as Partial<SettingsState>)
    await saveAllSettings(currentSettings)
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  initializeStore(set)

  return {
    defaultModel: loadSettingFromLocalStorage('defaultModel', 'auto'),
    defaultReasoning: loadSettingFromLocalStorage('defaultReasoning', 'medium'),
    defaultPermission: loadSettingFromLocalStorage('defaultPermission', 'ask'),
    showStatusCard: loadSettingFromLocalStorage('showStatusCard', true),

    setDefaultModel: (model) => {
      currentSettings.defaultModel = model
      saveToLocalStorage('defaultModel', model)
      saveAllSettings(currentSettings)
      set({ defaultModel: model })
    },

    setDefaultReasoning: (reasoning) => {
      currentSettings.defaultReasoning = reasoning
      saveToLocalStorage('defaultReasoning', reasoning)
      saveAllSettings(currentSettings)
      set({ defaultReasoning: reasoning })
    },

    setDefaultPermission: (permission) => {
      currentSettings.defaultPermission = permission
      saveToLocalStorage('defaultPermission', permission)
      saveAllSettings(currentSettings)
      set({ defaultPermission: permission })
    },

    setShowStatusCard: (show) => {
      currentSettings.showStatusCard = show
      saveToLocalStorage('showStatusCard', show)
      saveAllSettings(currentSettings)
      set({ showStatusCard: show })
    },
  }
})
