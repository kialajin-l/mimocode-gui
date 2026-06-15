import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageList } from '../MessageList'
import { Message } from '../../../types/session'

const makeMessage = (id: string, content: string, role: Message['role'] = 'assistant'): Message => ({
  id,
  role,
  content,
  timestamp: new Date('2026-06-15T10:00:00Z'),
})

function setScrollMetrics(element: HTMLElement, metrics: { scrollTop: number; clientHeight: number; scrollHeight: number }) {
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    writable: true,
    value: metrics.scrollTop,
  })
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  })
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  })
}

describe('MessageList scrolling', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('scrolls to the latest message when switching sessions', async () => {
    const { rerender } = render(
      <div className="chat-area">
        <MessageList messages={[makeMessage('m1', '旧会话消息')]} sessionId="session-1" />
      </div>
    )

    rerender(
      <div className="chat-area">
        <MessageList messages={[makeMessage('m2', '新会话消息')]} sessionId="session-2" />
      </div>
    )

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })
  })

  it('shows a return-to-latest button after the user scrolls away from bottom', () => {
    const { container } = render(
      <div className="chat-area">
        <MessageList messages={[makeMessage('m1', '第一条'), makeMessage('m2', '第二条')]} sessionId="session-1" />
      </div>
    )
    const chatArea = container.querySelector('.chat-area') as HTMLElement
    setScrollMetrics(chatArea, { scrollTop: 0, clientHeight: 300, scrollHeight: 1000 })

    fireEvent.scroll(chatArea)

    expect(screen.getByRole('button', { name: '回到最新消息' })).toBeTruthy()
  })

  it('returns to the latest message when the button is clicked', () => {
    const { container } = render(
      <div className="chat-area">
        <MessageList messages={[makeMessage('m1', '第一条'), makeMessage('m2', '第二条')]} sessionId="session-1" />
      </div>
    )
    const chatArea = container.querySelector('.chat-area') as HTMLElement
    setScrollMetrics(chatArea, { scrollTop: 0, clientHeight: 300, scrollHeight: 1000 })

    fireEvent.scroll(chatArea)
    fireEvent.click(screen.getByRole('button', { name: '回到最新消息' }))

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '回到最新消息' })).toBeNull()
  })
})
