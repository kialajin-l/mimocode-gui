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
  onNewSession: (projectId: string) => void
}

export function ProjectNode({
  project, sessions, activeSessionId, expanded, onToggle,
  onSelectSession, onDeleteSession, onRenameSession, onNewSession
}: ProjectNodeProps) {
  return (
    <div className={`project-node ${expanded ? 'expanded' : ''}`}>
      <div className="project-header" onClick={onToggle}>
        <span className="project-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <span className="project-icon-dot" style={{ background: project.color }} />
        <span className="project-name-text">{project.name}</span>
        <button
          className="project-add-session"
          onClick={(e) => { e.stopPropagation(); onNewSession(project.id) }}
          title="New session"
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
