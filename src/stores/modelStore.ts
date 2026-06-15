import { create } from 'zustand'
import { PROVIDER_PRESETS } from '../data/presetProviders'

export interface CustomProvider {
  id: string
  name: string
  baseUrl: string
  keyConfigured?: boolean
  keyMasked?: string
  defaultModel?: string
  contextLength?: number
  models: string[]
  apiMode?: string
}

export interface ProviderGroup {
  id: string
  label: string
  baseUrl: string
  models: string[]
  keyConfigured?: boolean
  keyMasked?: string
  isCustom: boolean
  isPreset: boolean
  isCli?: boolean
  customProviderId?: string
  source?: string
  apiMode?: string
}

interface ModelState {
  providers: ProviderGroup[]
  customProviders: CustomProvider[]
  loaded: boolean
  cliModels: string[]
  cliProviders: ProviderGroup[]
  loadProviders: () => Promise<void>
  addCustomProvider: (provider: Omit<CustomProvider, 'id'>) => Promise<string | false>
  updateCustomProvider: (id: string, updates: Partial<CustomProvider>) => Promise<boolean>
  removeCustomProvider: (id: string) => Promise<boolean>
  fetchProviderModels: (baseUrl: string, providerId?: string) => Promise<string[]>
  fetchProviderModelsResult: (baseUrl: string, providerId?: string) => Promise<{ success: boolean; models: string[]; error?: string }>
  refreshCliModels: () => Promise<void>
  getAllModels: () => string[]
}

function loadFromStorage(): { providers: ProviderGroup[]; customProviders: CustomProvider[] } {
  try {
    const raw = localStorage.getItem('mimocode-providers')
    if (raw) {
      const data = JSON.parse(raw)
      return {
        providers: data.providers || [],
        customProviders: data.customProviders || []
      }
    }
  } catch {}
  return { providers: [], customProviders: [] }
}

function saveToStorage(providers: ProviderGroup[], customProviders: CustomProvider[]) {
  localStorage.setItem('mimocode-providers', JSON.stringify({ providers, customProviders }))
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '').toLowerCase()
}

function normalizeProviderName(name: string) {
  return name.trim().toLowerCase()
}

function findMatchingCustomProvider(
  cliProvider: Pick<ProviderGroup, 'label' | 'baseUrl'>,
  customProviders: CustomProvider[]
) {
  const cliBaseUrl = normalizeBaseUrl(cliProvider.baseUrl)
  const cliName = normalizeProviderName(cliProvider.label)
  return customProviders.find(provider => {
    const sameBaseUrl = cliBaseUrl && normalizeBaseUrl(provider.baseUrl) === cliBaseUrl
    const sameName = normalizeProviderName(provider.name) === cliName
    return Boolean(sameBaseUrl || sameName)
  })
}

function isEditableCliProvider(provider: Pick<ProviderGroup, 'source'>) {
  return provider.source === 'Credentials' || provider.source === 'Environment'
}

function isDuplicateProvider(
  provider: Omit<CustomProvider, 'id'>,
  customProviders: CustomProvider[],
  ignoreId?: string
) {
  const nextBaseUrl = normalizeBaseUrl(provider.baseUrl)
  const nextName = normalizeProviderName(provider.name)
  return customProviders.some(existing => {
    if (ignoreId && existing.id === ignoreId) return false
    return normalizeBaseUrl(existing.baseUrl) === nextBaseUrl || normalizeProviderName(existing.name) === nextName
  })
}

export const useModelStore = create<ModelState>((set, get) => ({
  providers: [],
  customProviders: [],
  loaded: false,
  cliModels: [],
  cliProviders: [],

  loadProviders: async () => {
    if (get().loaded) return

    const stored = loadFromStorage()
    const api = window.electronAPI

    // Fetch key status for each custom provider from secure storage
    if (api?.apiKeyGetStatus && stored.customProviders.length > 0) {
      try {
        const keyResults = await Promise.all(
          stored.customProviders.map(cp => api.apiKeyGetStatus(cp.id))
        )
        stored.customProviders = stored.customProviders.map((cp, i) => ({
          ...cp,
          keyConfigured: keyResults[i]?.configured || false,
          keyMasked: keyResults[i]?.masked,
        }))
      } catch { /* ignore */ }
    }

    // Build provider groups from presets
    const presetGroups: ProviderGroup[] = PROVIDER_PRESETS.map(preset => ({
      id: preset.value,
      label: preset.label,
      baseUrl: preset.base_url,
      models: preset.models,
      isCustom: false,
      isPreset: true,
      apiMode: preset.api_mode,
    }))

    const cliProviders: ProviderGroup[] = []
    const customProviders = [...stored.customProviders]
    if (api?.listCliProviders) {
      try {
        const result = await api.listCliProviders()
        if (result?.success && Array.isArray(result.providers)) {
          cliProviders.push(...result.providers.map(provider => ({
            id: provider.id,
            label: provider.label,
            baseUrl: provider.baseUrl || '',
            models: provider.models,
            isCustom: false,
            isPreset: false,
            isCli: true,
            source: provider.source,
          })).map(provider => {
            let matched = isEditableCliProvider(provider)
              ? findMatchingCustomProvider(provider, customProviders)
              : undefined
            if (!matched && isEditableCliProvider(provider)) {
              matched = {
                id: provider.id.replace(/^cli:/, 'cli-bound:'),
                name: provider.label,
                baseUrl: provider.baseUrl,
                models: provider.models,
              }
              customProviders.push(matched)
            }
            if (!matched) return provider
            return {
              ...provider,
              label: matched.name || provider.label,
              baseUrl: matched.baseUrl || provider.baseUrl,
              keyConfigured: matched.keyConfigured,
              keyMasked: matched.keyMasked,
              models: matched.models.length > 0 ? matched.models : provider.models,
              isCustom: true,
              customProviderId: matched.id,
              apiMode: matched.apiMode,
            }
          }))
        }
      } catch (err) {
        console.error('[ModelStore] listCliProviders error:', err)
      }
    }

    const customGroups: ProviderGroup[] = customProviders
      .filter(cp => !cp.id.startsWith('cli-bound:') && !cliProviders.some(provider => provider.customProviderId === cp.id))
      .map(cp => ({
        id: `custom:${cp.id}`,
        label: cp.name,
        baseUrl: cp.baseUrl,
        models: cp.models,
        keyConfigured: cp.keyConfigured,
        keyMasked: cp.keyMasked,
        isCustom: true,
        isPreset: false,
      }))

    const allProviders = [...cliProviders, ...presetGroups, ...customGroups]
    saveToStorage(allProviders, customProviders)

    set({
      providers: allProviders,
      customProviders,
      cliProviders,
      loaded: true,
    })

    // Load CLI models
    await get().refreshCliModels()
  },

  addCustomProvider: async (provider) => {
    if (isDuplicateProvider(provider, get().customProviders)) {
      return false
    }

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newProvider: CustomProvider = { ...provider, id }

    const customProviders = [...get().customProviders, newProvider]
    const providers = [
      ...get().providers,
      {
        id: `custom:${id}`,
        label: provider.name,
        baseUrl: provider.baseUrl,
        models: provider.models,
        keyConfigured: provider.keyConfigured,
        keyMasked: provider.keyMasked,
        isCustom: true,
        isPreset: false,
      }
    ]

    saveToStorage(providers, customProviders)
    set({ providers, customProviders })
    return id
  },

  updateCustomProvider: async (id, updates) => {
    const current = get().customProviders.find(cp => cp.id === id)
    if (!current) return false
    const nextProvider = { ...current, ...updates }
    if (isDuplicateProvider(nextProvider, get().customProviders, id)) {
      return false
    }

    const customProviders = get().customProviders.map(cp =>
      cp.id === id ? { ...cp, ...updates } : cp
    )

    const providers = get().providers.map(p =>
      p.id === `custom:${id}` || p.customProviderId === id
        ? {
            ...p,
            ...updates,
            label: updates.name || p.label,
            customProviderId: p.customProviderId,
            isCli: p.isCli,
            isCustom: true,
          }
        : p
    )

    saveToStorage(providers, customProviders)
    set({ providers, customProviders })
    return true
  },

  removeCustomProvider: async (id) => {
    const customProviders = get().customProviders.filter(cp => cp.id !== id)
    const providers = get().providers
      .filter(p => p.id !== `custom:${id}`)
      .map(p => p.customProviderId === id
        ? { ...p, customProviderId: undefined, isCustom: false, keyConfigured: undefined, keyMasked: undefined }
        : p
      )

    // Delete API key from secure storage
    window.electronAPI?.apiKeyDelete?.(id)

    saveToStorage(providers, customProviders)
    set({ providers, customProviders })
    return true
  },

  fetchProviderModels: async (baseUrl: string, providerId?: string) => {
    const result = await get().fetchProviderModelsResult(baseUrl, providerId)
    return result.success ? result.models : []
  },

  fetchProviderModelsResult: async (baseUrl: string, providerId?: string) => {
    try {
      const api = window.electronAPI
      if (!api?.fetchProviderModels) {
        return { success: false, models: [], error: '当前环境不支持获取 Provider 模型' }
      }

      const result = await api.fetchProviderModels(baseUrl, undefined, providerId)
      const resultError = String(result?.error || '')
      if (resultError.includes('No handler registered')) {
        return {
          success: false,
          models: [],
          error: 'Provider 模型获取服务未加载，请完整退出并重启应用。'
        }
      }
      if (result?.success && Array.isArray(result.models)) {
        return { success: true, models: result.models }
      }
      return {
        success: false,
        models: [],
        error: result?.error || '未获取到模型，请检查 Base URL 和 API Key'
      }
    } catch (err) {
      console.error('[ModelStore] fetchProviderModels error:', err)
      const message = String(err)
      return {
        success: false,
        models: [],
        error: message.includes('No handler registered')
          ? 'Provider 模型获取服务未加载，请完整退出并重启应用。'
          : message
      }
    }
  },

  refreshCliModels: async () => {
    try {
      const api = window.electronAPI
      if (!api?.listModels) return

      const result = await api.listModels()
      if (result?.success && Array.isArray(result.models)) {
        const cliModels = result.models
        set(state => ({
          cliModels,
          cliProviders: state.cliProviders.length > 0
            ? state.cliProviders
            : groupCliModels(cliModels),
          providers: state.cliProviders.length > 0
            ? state.providers
            : [...groupCliModels(cliModels), ...state.providers.filter(provider => !provider.isCli)],
        }))
      }
    } catch (err) {
      console.error('[ModelStore] refreshCliModels error:', err)
    }
  },

  getAllModels: () => {
    const models = new Set<string>()

    // Add CLI models
    get().cliModels.forEach(m => models.add(m))

    // Add provider models
    get().providers.forEach(p => {
      p.models.forEach(m => models.add(m))
    })

    return Array.from(models).sort()
  },
}))

function groupCliModels(models: string[]): ProviderGroup[] {
  const labels: Record<string, string> = {
    mimo: 'MiMo',
    xiaomi: 'Xiaomi',
    deepseek: 'DeepSeek',
  }

  const groups = new Map<string, string[]>()
  for (const model of models) {
    const [prefix] = model.split('/')
    if (!prefix) continue
    groups.set(prefix, [...(groups.get(prefix) || []), model])
  }

  return Array.from(groups.entries()).map(([prefix, providerModels]) => ({
    id: `cli:${prefix}`,
    label: labels[prefix] || prefix,
    baseUrl: '',
    models: Array.from(new Set(providerModels)),
    isCustom: false,
    isPreset: false,
    isCli: true,
    source: 'MiMo CLI',
  }))
}
