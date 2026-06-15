import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageInput } from '../MessageInput'
import { useModelStore } from '../../../stores/modelStore'

describe('MessageInput model select', () => {
  beforeEach(() => {
    window.localStorage.clear()
    ;(globalThis as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
    ;(window as any).electronAPI = {
      listModels: vi.fn().mockResolvedValue({
        success: true,
        models: ['mimo/mimo-auto', 'xiaomi/mimo-v2.5-pro'],
      }),
    }
    useModelStore.setState({
      providers: [],
      customProviders: [],
      loaded: false,
      cliModels: [],
    })
  })

  it('groups CLI native models by their provider source', async () => {
    render(<MessageInput onSend={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'mimo-auto' })).toBeTruthy()
    })
    expect(screen.getByRole('group', { name: 'MiMo' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Xiaomi' })).toBeTruthy()
  })
})
