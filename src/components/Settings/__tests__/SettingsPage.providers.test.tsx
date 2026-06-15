import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SettingsPage } from '../SettingsPage'
import { useModelStore } from '../../../stores/modelStore'
import { I18nProvider } from '../../../i18n'

describe('SettingsPage providers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    ;(window as any).electronAPI = {
      listModels: vi.fn().mockResolvedValue({
        success: true,
        models: ['mimo/mimo-auto', 'deepseek/deepseek-chat', 'xiaomi/mimo-v2.5-pro'],
      }),
      listCliProviders: vi.fn().mockResolvedValue({
        success: true,
        providers: [
          { id: 'cli:xiaomi', label: 'Xiaomi', source: 'Credentials', models: ['xiaomi/mimo-v2.5-pro'] },
          { id: 'cli:deepseek', label: 'DeepSeek', source: 'Environment', models: ['deepseek/deepseek-chat'] },
        ],
      }),
    }
    useModelStore.setState({
      providers: [],
      customProviders: [],
      loaded: false,
      cliModels: [],
      cliProviders: [],
    })
  })

  it('shows MiMo CLI providers in the model settings tab', async () => {
    render(
      <I18nProvider>
        <SettingsPage onClose={vi.fn()} />
      </I18nProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /模型/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Xiaomi').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('DeepSeek')).toBeTruthy()
    expect(screen.getAllByText('MiMo CLI').length).toBeGreaterThan(0)
  })
})
