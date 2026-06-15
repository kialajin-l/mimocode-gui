import { useEffect, useState } from 'react'
import { Project, Session } from '../../types/session'
import { SessionItem } from './SessionItem'

interface ProjectNodeProps {
  project: Project
  sessions: Session[]
  archivedCount: number
  activeSessionId: string | null
  expanded: boolean
  onToggle: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onArchiveSession: (id: string) => void
  onRenameSession: (id: string, name: string) => void
  onOpenInNewWindow?: (id: string) => void
  onNewSession: (projectId: string) => void
  onArchiveProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
}

export function ProjectNode({
  project, sessions, archivedCount, activeSessionId, expanded, onToggle,
  onSelectSession, onDeleteSession, onArchiveSession, onRenameSession, onOpenInNewWindow, onNewSession,
  onArchiveProject, onDeleteProject
}: ProjectNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const openContextMenu = (x: number, y: number) => {
    const menuWidth = 180
    const menuHeight = 140
    const clampedX = Math.min(x, window.innerWidth - menuWidth - 8)
    const clampedY = Math.min(y, window.innerHeight - menuHeight - 8)
    setContextMenu({ x: Math.max(0, clampedX), y: Math.max(0, clampedY) })
  }

  return (
    <div className={`project-node ${expanded ? 'expanded' : ''}`}>
      <div
        className="project-header"
        onClick={onToggle}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          openContextMenu(event.clientX, event.clientY)
        }}
      >
        <span className="project-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <span className="project-folder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7.5A2.5 2.5 0 015.5 5h4l2 2h7A2.5 2.5 0 0121 9.5v7A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z" />
          </svg>
        </span>
        <span className="project-icon-dot" style={{ background: project.color }} />
        <span className="project-name-text" title={project.cwd}>{project.name}</span>
        {archivedCount > 0 && (
          <span className="project-archived-badge" title={`${archivedCount} 个已归档会话`}>{archivedCount}</span>
        )}
        <button
          className="project-add-session"
          onClick={(e) => { e.stopPropagation(); onNewSession(project.id) }}
          title="新建会话"
        >
          +
        </button>
        <button
          className="project-more-btn"
          onClick={(event) => {
            event.stopPropagation()
            openContextMenu(event.clientX, event.clientY)
          }}
          title="项目操作"
        >
          ⋯
        </button>
      </div>
      {expanded && (
        <div className="session-list-nested">
          {sessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => onSelectSession(session.id)}
              onDelete={() => onDeleteSession(session.id)}
              onArchive={() => onArchiveSession(session.id)}
              onRename={onRenameSession}
              onOpenInNewWindow={onOpenInNewWindow}
            />
          ))}
        </div>
      )}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              onNewSession(project.id)
            }}
          >
            新建会话
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              onArchiveProject(project.id)
            }}
          >
            归档项目
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-item danger"
            onClick={() => {
              setContextMenu(null)
              onDeleteProject(project.id)
            }}
          >
            移除项目
          </button>
        </div>
      )}
    </div>
  )
}
