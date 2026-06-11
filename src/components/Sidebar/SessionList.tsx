import { useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { SessionItem } from './SessionItem'

export function SessionList() {
  const { sessions, activeSessionId, createSession, deleteSession, setActiveSession } = useSession()
  const [showInput, setShowInput] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    if (newName.trim()) {
      createSession(newName.trim(), window.electronAPI ? '.' : process.cwd())
      setNewName('')
      setShowInput(false)
    }
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
        <button onClick={() => setShowInput(!showInput)} className="session-list-add">
          +
        </button>
      </div>
      {showInput && (
        <div className="session-input-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name..."
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate} disabled={!newName.trim()}>OK</button>
        </div>
      )}
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
