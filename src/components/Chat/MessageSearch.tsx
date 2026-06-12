import { useState, useMemo } from 'react'
import { Message } from '../../types/session'

interface MessageSearchProps {
  messages: Message[]
  onJumpToMessage: (messageId: string) => void
  onClose: () => void
}

export function MessageSearch({ messages, onJumpToMessage, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return messages
      .filter(m => m.content.toLowerCase().includes(q))
      .slice(0, 20)
  }, [query, messages])

  return (
    <div className="message-search">
      <div className="message-search-input">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索当前会话..."
          autoFocus
        />
        <button className="message-search-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {query.trim() && (
        <div className="message-search-results">
          {results.length === 0 ? (
            <div className="message-search-empty">未找到结果</div>
          ) : (
            results.map(message => (
              <div
                key={message.id}
                className="message-search-result"
                onClick={() => {
                  onJumpToMessage(message.id)
                  onClose()
                }}
              >
                <div className="message-search-role">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-search-content">
                  {highlightMatch(message.content, query)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function highlightMatch(text: string, _query: string): string {
  const truncated = text.length > 150 ? text.substring(0, 150) + '...' : text
  return truncated
}
