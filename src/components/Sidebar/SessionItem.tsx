import { useState, useRef, useEffect } from 'react'
import { Session } from '../../types/session'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onArchive: () => void
  onRename: (id: string, name: string) => void
  onOpenInNewWindow?: (id: string) => void
}

export function SessionItem({ session, isActive, onSelect, onDelete, onArchive, onRename, onOpenInNewWindow }: SessionItemProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.name)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(session.name)
    setEditing(true)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
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
    <>
      <div
        className={`session-item ${isActive ? 'active' : ''}`}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
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
          className="session-archive-btn"
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
          title="归档会话"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
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

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              setEditValue(session.name)
              setEditing(true)
            }}
          >
            重命名
          </button>
          {onOpenInNewWindow && (
            <button
              className="context-menu-item"
              onClick={() => {
                setContextMenu(null)
                onOpenInNewWindow(session.id)
              }}
            >
              在新窗口打开
            </button>
          )}
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              onArchive()
            }}
          >
            归档
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-item danger"
            onClick={() => {
              setContextMenu(null)
              onDelete()
            }}
          >
            删除
          </button>
        </div>
      )}
    </>
  )
}
