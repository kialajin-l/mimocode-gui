import { Project, Session } from '../../types/session'
import { SessionItem } from './SessionItem'

interface ProjectNodeProps {
  project: Project
  sessions: Session[]
  activeSessionId: string | null
  expanded: boolean
  onToggle: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, name: string) => void
  onOpenInNewWindow?: (id: string) => void
  onNewSession: (projectId: string) => void
}

export function ProjectNode({
  project, sessions, activeSessionId, expanded, onToggle,
  onSelectSession, onDeleteSession, onRenameSession, onOpenInNewWindow, onNewSession
}: ProjectNodeProps) {
  return (
    <div className={`project-node ${expanded ? 'expanded' : ''}`}>
      <div className="project-header" onClick={onToggle}>
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
        <button
          className="project-add-session"
          onClick={(e) => { e.stopPropagation(); onNewSession(project.id) }}
          title="新建会话"
        >
          +
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
              onRename={onRenameSession}
              onOpenInNewWindow={onOpenInNewWindow}
            />
          ))}
        </div>
      )}
    </div>
  )
}
