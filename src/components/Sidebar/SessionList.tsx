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
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([])

  const toggleProject = (id: string) => {
    setExpandedProjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), '.')
      setNewProjectName('')
      setShowNewProject(false)
      setProjectMenuOpen(false)
    }
  }

  const handleCreateFromFolder = async () => {
    const api = window.electronAPI
    if (!api?.openDirectory) {
      setProjectError('当前环境无法打开文件夹选择器')
      return
    }

    const result = await api.openDirectory()
    if (result?.success && result.path) {
      const project = createProject(result.name || result.path, result.path)
      setExpandedProjectIds(prev => prev.includes(project.id) ? prev : [...prev, project.id])
      setShowNewProject(false)
      setProjectMenuOpen(false)
      setProjectError('')
    } else if (!result?.canceled) {
      const error = result?.error || '无法打开文件夹选择器'
      setProjectError(error.includes('No handler registered')
        ? '文件夹选择器需要重启 MiMoCode 后生效：请完全关闭应用后重新打开。'
        : error
      )
    }
  }

  const handleNewSessionInProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    const projectSessions = sessions.filter(s => s.projectId === projectId)
    const nextNumber = getNextSessionNumber(projectSessions.map(session => session.name))
    const name = `Session ${nextNumber}`
    createSession(name, project?.cwd || '.', projectId)
    if (!expandedProjectIds.includes(projectId)) {
      setExpandedProjectIds(prev => [...prev, projectId])
    }
  }

  const handleRenameSession = (id: string, name: string) => {
    updateSession(id, { name })
  }

  const handleOpenInNewWindow = async (id: string) => {
    const api = window.electronAPI
    if (api) {
      await api.openSessionWindow(id)
    }
  }

  const ungroupedSessions = sessions.filter(s => !s.projectId)

  return (
    <div className="session-list">
      <div className="session-list-header project-list-header">
        <h3>项目</h3>
        <div className="project-create">
          <button
            onClick={() => setProjectMenuOpen(prev => !prev)}
            className="session-list-add"
            title="添加项目"
          >
            +
          </button>
          {projectMenuOpen && (
            <div className="project-create-menu">
              <button
                type="button"
                onClick={() => {
                  setShowNewProject(true)
                  setProjectMenuOpen(false)
                }}
              >
                <span className="project-create-icon">＋</span>
                新建空白项目
              </button>
              <button type="button" onClick={handleCreateFromFolder}>
                <span className="project-create-icon">⌁</span>
                使用现有文件夹
              </button>
            </div>
          )}
        </div>
      </div>

      {showNewProject && (
        <div className="session-input-row">
          <input
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="项目名..."
            onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
            autoFocus
          />
          <button onClick={handleCreateProject} disabled={!newProjectName.trim()}>创建</button>
        </div>
      )}

      {projectError && (
        <div className="project-error">{projectError}</div>
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
            onOpenInNewWindow={handleOpenInNewWindow}
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

    </div>
  )
}

function getNextSessionNumber(names: string[]) {
  const numbers = names
    .map(name => name.match(/^(?:Session\s*)?(\d+)$/i)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(value => Number(value))
    .filter(Number.isFinite)
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
}
