import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useModelStore } from '../modelStore'

describe('modelStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useModelStore.setState({
      providers: [],
      customProviders: [],
      loaded: false,
      cliModels: [],
      cliProviders: [],
    })
  })

  it('loads CLI native models alongside configured providers', async () => {
    ;(window as any).electronAPI = {
      listModels: vi.fn().mockResolvedValue({
        success: true,
        models: ['mimo/mimo-auto', 'xiaomi/mimo-v2.5-pro'],
      }),
    }

    await useModelStore.getState().loadProviders()

    expect(useModelStore.getState().cliModels).toContain('mimo/mimo-auto')
    expect(useModelStore.getState().getAllModels()).toContain('mimo/mimo-auto')
  })

  it('binds editable CLI providers to matching configured providers', async () => {
    ;(window as any).electronAPI = {
      listModels: vi.fn().mockResolvedValue({
        success: true,
        models: ['deepseek/deepseek-chat'],
      }),
      listCliProviders: vi.fn().mockResolvedValue({
        success: true,
        providers: [
          { id: 'cli:deepseek', label: 'DeepSeek', source: 'Environment', models: ['deepseek/deepseek-chat'] },
        ],
      }),
    }

    await useModelStore.getState().addCustomProvider({
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      models: ['deepseek-chat'],
    })
    useModelStore.setState({ loaded: false, providers: [] })

    await useModelStore.getState().loadProviders()

    const deepseek = useModelStore.getState().providers.find(provider => provider.id === 'cli:deepseek')
    expect(deepseek?.isCustom).toBe(true)
    expect(deepseek?.customProviderId).toBeTruthy()
  })

  it('does not add the same provider twice', async () => {
    ;(window as any).electronAPI = {
      listModels: vi.fn().mockResolvedValue({ success: true, models: [] }),
    }

    const first = await useModelStore.getState().addCustomProvider({
      name: 'Z.AI / GLM',
      baseUrl: 'https://api.z.ai/api/paas/v4',
      models: ['glm-5'],
    })
    const second = await useModelStore.getState().addCustomProvider({
      name: 'Z.AI / GLM Copy',
      baseUrl: 'https://api.z.ai/api/paas/v4/',
      models: ['glm-5'],
    })

    expect(first).toBeTruthy()
    expect(typeof first).toBe('string')
    expect(second).toBe(false)
    expect(useModelStore.getState().customProviders).toHaveLength(1)
  })
})
