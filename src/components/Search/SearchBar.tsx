import { useRef, useEffect, useCallback } from 'react'
import { Session, Message } from '../../types/session'
import { useSessionStore } from '../../stores/sessionStore'

interface SearchResult {
  type: 'session' | 'message'
  session: Session
  message?: Message
}

interface SearchBarProps {
  query: string
  results: SearchResult[]
  onQueryChange: (query: string) => void
  onClose: () => void
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function SearchBar({ query, results, onQueryChange, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const setActiveSession = useSessionStore(s => s.setActiveSession)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleResultClick = useCallback((result: SearchResult) => {
    setActiveSession(result.session.id)
    onClose()
  }, [setActiveSession, onClose])

  return (
    <div className="search-overlay" ref={containerRef}>
      <div className="search-bar">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="搜索会话和消息... (Ctrl+K)"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {query && (
            <button className="search-clear" onClick={() => onQueryChange('')}>
              ×
            </button>
          )}
        </div>
        {results.length > 0 && (
          <div className="search-results">
            {results.slice(0, 20).map((result, index) => (
              <div
                key={`${result.session.id}-${result.type}-${result.message?.id || index}`}
                className="search-result-item"
                onClick={() => handleResultClick(result)}
              >
                {result.type === 'session' ? (
                  <>
                    <div className="search-result-icon session-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div className="search-result-content">
                      <div className="search-result-title" dangerouslySetInnerHTML={{ __html: highlightMatch(result.session.name, query) }} />
                      <div className="search-result-meta">
                        {result.session.messages.length} 条消息
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="search-result-icon message-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div className="search-result-content">
                      <div className="search-result-title">
                        {truncate(result.message!.content, 80)}
                      </div>
                      <div className="search-result-meta">
                        {result.session.name} · {result.message!.role === 'user' ? '用户' : 'AI'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {results.length > 20 && (
              <div className="search-result-more">
                还有 {results.length - 20} 条结果...
              </div>
            )}
          </div>
        )}
        {query && results.length === 0 && (
          <div className="search-empty">
            未找到匹配结果
          </div>
        )}
      </div>
    </div>
  )
}