import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageInput } from '../MessageInput'
import { useModelStore } from '../../../stores/modelStore'

describe('MessageInput autosize', () => {
  beforeEach(() => {
    window.localStorage.clear()
    ;(globalThis as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
    useModelStore.setState({
      providers: [],
      customProviders: [],
      loaded: true,
      cliModels: [],
    })
  })

  it('expands textarea height to fit long multi-line input', async () => {
    render(<MessageInput onSend={vi.fn()} />)
    const textarea = screen.getByPlaceholderText('描述你的需求或输入 / 查看命令...') as HTMLTextAreaElement
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 128,
    })

    fireEvent.change(textarea, {
      target: {
        value: ['第一行内容', '第二行内容', '第三行内容', '第四行内容'].join('\n'),
      },
    })

    await waitFor(() => {
      expect(textarea.style.height).toBe('128px')
      expect(textarea.style.overflowY).toBe('hidden')
    })
  })
})
