import { Session } from '../../types/session'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  return (
    <div
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <span className="session-title">{session.name}</span>
      <button
        className="session-delete-btn"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="删除会话"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
