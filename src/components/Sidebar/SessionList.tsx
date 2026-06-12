import { useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { ProjectNode } from './ProjectNode'

export function SessionList() {
  const {
    sessions, projects, activeSessionId, createSession, deleteSession,
    setActiveSession, createProject, updateSession
  } = useSession()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([])

  const toggleProject = (id: string) => {
    setExpandedProjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim())
      setNewProjectName('')
      setShowNewProject(false)
    }
  }

  const handleNewSessionInProject = (projectId: string) => {
    const name = `Session ${sessions.length + 1}`
    createSession(name, '.', projectId)
    if (!expandedProjectIds.includes(projectId)) {
      setExpandedProjectIds(prev => [...prev, projectId])
    }
  }

  const handleRenameSession = (id: string, name: string) => {
    updateSession(id, { name })
  }

  const ungroupedSessions = sessions.filter(s => !s.projectId)

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
        <button onClick={() => setShowNewProject(!showNewProject)} className="session-list-add">+</button>
      </div>

      {showNewProject && (
        <div className="session-input-row">
          <input
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
            autoFocus
          />
          <button onClick={handleCreateProject} disabled={!newProjectName.trim()}>OK</button>
        </div>
      )}

      <div className="session-list-items">
        {projects.map(project => (
          <ProjectNode
            key={project.id}
            project={project}
            sessions={sessions.filter(s => s.projectId === project.id)}
            activeSessionId={activeSessionId}
            expanded={expandedProjectIds.includes(project.id)}
            onToggle={() => toggleProject(project.id)}
            onSelectSession={setActiveSession}
            onDeleteSession={deleteSession}
            onRenameSession={handleRenameSession}
            onNewSession={handleNewSessionInProject}
          />
        ))}

        {ungroupedSessions.length > 0 && (
          <div className="session-list-ungrouped">
            <div className="session-list-section-label">其他</div>
            {ungroupedSessions.map(session => (
              <div
                key={session.id}
                className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => setActiveSession(session.id)}
              >
                <span className="session-title">{session.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
        + New project
      </button>
    </div>
  )
}
