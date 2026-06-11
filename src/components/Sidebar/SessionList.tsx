import { useSession } from '../../hooks/useSession'
import { SessionItem } from './SessionItem'

export function SessionList() {
  const { sessions, activeSessionId, setActiveSession, deleteSession, startSession } = useSession()

  const handleCreate = () => {
    const name = prompt('Session name:')
    if (name) {
      startSession(name, window.electronAPI ? '.' : process.cwd())
    }
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
        <button onClick={handleCreate} className="session-list-add">
          +
        </button>
      </div>
      <div className="session-list-items">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => setActiveSession(session.id)}
            onDelete={() => deleteSession(session.id)}
          />
        ))}
      </div>
    </div>
  )
}
