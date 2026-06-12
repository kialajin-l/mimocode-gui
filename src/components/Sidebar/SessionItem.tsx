import { useState, useRef, useEffect } from 'react'
import { Session } from '../../types/session'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (id: string, name: string) => void
}

export function SessionItem({ session, isActive, onSelect, onDelete, onRename }: SessionItemProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(session.name)
    setEditing(true)
  }

  const handleSubmit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== session.name) {
      onRename(session.id, trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  return (
    <div
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="session-rename-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="session-title">{session.name}</span>
      )}
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
