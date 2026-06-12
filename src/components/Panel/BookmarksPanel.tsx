import { useSessionStore } from '../../stores/sessionStore'
import { Message } from '../../types/session'

interface BookmarksPanelProps {
  sessionId: string
}

export function BookmarksPanel({ sessionId }: BookmarksPanelProps) {
  const session = useSessionStore(s => s.sessions.find(sess => sess.id === sessionId))
  const toggleBookmark = useSessionStore(s => s.toggleMessageBookmark)

  if (!session) return null

  const bookmarkedMessages = session.messages.filter(m => m.bookmarked)

  if (bookmarkedMessages.length === 0) {
    return (
      <div className="bookmarks-panel">
        <div className="bookmarks-header">
          <h4>书签</h4>
        </div>
        <div className="bookmarks-empty">
          <p>暂无书签消息</p>
          <p className="bookmarks-empty-hint">点击消息旁的星标添加书签</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bookmarks-panel">
      <div className="bookmarks-header">
        <h4>书签</h4>
        <span className="bookmarks-count">{bookmarkedMessages.length} 条</span>
      </div>
      <div className="bookmarks-list">
        {bookmarkedMessages.map(message => (
          <BookmarkItem
            key={message.id}
            message={message}
            onRemove={() => toggleBookmark(sessionId, message.id)}
          />
        ))}
      </div>
    </div>
  )
}

function BookmarkItem({ message, onRemove }: { message: Message; onRemove: () => void }) {
  const truncatedContent = message.content.length > 100
    ? message.content.substring(0, 100) + '...'
    : message.content

  return (
    <div className="bookmark-item">
      <div className="bookmark-item-content">
        <div className="bookmark-item-role">
          {message.role === 'user' ? '👤 User' : '🤖 MiMoCode'}
        </div>
        <div className="bookmark-item-text">{truncatedContent}</div>
        <div className="bookmark-item-time">{message.timestamp.toLocaleString()}</div>
      </div>
      <button className="bookmark-remove-btn" onClick={onRemove} title="移除书签">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  )
}
