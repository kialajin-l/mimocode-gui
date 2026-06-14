import { create } from 'zustand'

interface SettingsState {
  defaultModel: string
  defaultReasoning: string
  defaultPermission: string
  showStatusCard: boolean
  _currentSettings: Record<string, unknown>
  _initialized: boolean
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
  if (typeof window === 'undefined') return null
  try {
    const api = (window as any).electronAPI
    if (api?.getSettings) {
      const result = await api.getSettings()
      if (result?.success && result.settings) {
        return result.settings
      }
    }
  } catch (err) {
    console.warn('[Settings] Failed to load from IPC, using localStorage', err)
  }
  return null
}

async function saveAllSettings(settings: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    const api = (window as any).electronAPI
    if (api?.setSettings) {
      await api.setSettings(settings)
    }
  } catch (err) {
    console.warn('[Settings] IPC save failed, using localStorage fallback', err)
  }
}

let initialized = false

async function initializeStore(set: (partial: Partial<SettingsState>) => void) {
  if (initialized) return
  initialized = true

  const persisted = await loadAllSettings()
  if (persisted && Object.keys(persisted).length > 0) {
    set({
      defaultModel: (persisted.defaultModel as string) ?? loadSettingFromLocalStorage('defaultModel', 'auto'),
      defaultReasoning: (persisted.defaultReasoning as string) ?? loadSettingFromLocalStorage('defaultReasoning', 'medium'),
      defaultPermission: (persisted.defaultPermission as string) ?? loadSettingFromLocalStorage('defaultPermission', 'ask'),
      showStatusCard: (persisted.showStatusCard as boolean) ?? loadSettingFromLocalStorage('showStatusCard', true),
      _currentSettings: persisted,
      _initialized: true,
    })
  } else {
    const defaults = {
      defaultModel: loadSettingFromLocalStorage('defaultModel', 'auto'),
      defaultReasoning: loadSettingFromLocalStorage('defaultReasoning', 'medium'),
      defaultPermission: loadSettingFromLocalStorage('defaultPermission', 'ask'),
      showStatusCard: loadSettingFromLocalStorage('showStatusCard', true),
    }
    set({ ...defaults, _currentSettings: defaults, _initialized: true })
    await saveAllSettings(defaults)
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  initializeStore(set)

  return {
    defaultModel: loadSettingFromLocalStorage('defaultModel', 'auto'),
    defaultReasoning: loadSettingFromLocalStorage('defaultReasoning', 'medium'),
    defaultPermission: loadSettingFromLocalStorage('defaultPermission', 'ask'),
    showStatusCard: loadSettingFromLocalStorage('showStatusCard', true),
    _currentSettings: {},
    _initialized: false,

    setDefaultModel: (model) => {
      const current = useSettingsStore.getState()._currentSettings
      const updated = { ...current, defaultModel: model }
      saveToLocalStorage('defaultModel', model)
      saveAllSettings(updated)
      set({ defaultModel: model, _currentSettings: updated })
    },

    setDefaultReasoning: (reasoning) => {
      const current = useSettingsStore.getState()._currentSettings
      const updated = { ...current, defaultReasoning: reasoning }
      saveToLocalStorage('defaultReasoning', reasoning)
      saveAllSettings(updated)
      set({ defaultReasoning: reasoning, _currentSettings: updated })
    },

    setDefaultPermission: (permission) => {
      const current = useSettingsStore.getState()._currentSettings
      const updated = { ...current, defaultPermission: permission }
      saveToLocalStorage('defaultPermission', permission)
      saveAllSettings(updated)
      set({ defaultPermission: permission, _currentSettings: updated })
    },

    setShowStatusCard: (show) => {
      const current = useSettingsStore.getState()._currentSettings
      const updated = { ...current, showStatusCard: show }
      saveToLocalStorage('showStatusCard', show)
      saveAllSettings(updated)
      set({ showStatusCard: show, _currentSettings: updated })
    },
  }
})
