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
      <div className="session-item-content">
        <div className="session-item-name">{session.name}</div>
        <div className="session-item-status">
          <span className={`status-dot status-${session.status}`} />
          {session.status}
        </div>
      </div>
      <button
        className="session-item-delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        ×
      </button>
    </div>
  )
}
