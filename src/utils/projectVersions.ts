import { Session } from '../types/session'

export function getProjectVersionSessionId(sessions: Session[], activeSessionId?: string | null) {
  const activeSession = activeSessionId ? sessions.find(session => session.id === activeSessionId) : undefined

  // Must have an active session to determine project context
  if (!activeSession) return null

  const projectId = activeSession.projectId
  if (!projectId) return null

  // Only look at sessions within the same project
  const projectSessions = sessions.filter(session => session.projectId === projectId)
  const withVersions = projectSessions.filter(session => session.versions?.length > 0)
  if (withVersions.length === 0) return null

  // Prefer active session if it has versions
  if (activeSession.versions?.length) return activeSession.id

  // Otherwise, use the most recently archived session with versions
  const archivedWithVersions = withVersions.filter(session => session.archived)
  if (archivedWithVersions.length > 0) {
    return [...archivedWithVersions].sort((a, b) => (b.archivedAt?.getTime() || 0) - (a.archivedAt?.getTime() || 0))[0].id
  }

  return withVersions[0]?.id || null
}
