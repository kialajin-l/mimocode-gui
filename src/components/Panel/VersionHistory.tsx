import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'

interface VersionHistoryProps {
  sessionId: string
}

export function VersionHistory({ sessionId }: VersionHistoryProps) {
  const session = useSessionStore(s => s.sessions.find(sess => sess.id === sessionId))
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [label, setLabel] = useState('')

  if (!session) return null

  const handleSaveVersion = () => {
    const store = useSessionStore.getState()
    const sessionData = store.sessions.find(s => s.id === sessionId)
    if (!sessionData) return

    const version = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      messages: [...sessionData.messages],
      label: label.trim() || `Version ${sessionData.versions.length + 1}`
    }

    store.updateSession(sessionId, {
      versions: [...sessionData.versions, version]
    })

    setLabel('')
    setShowLabelInput(false)
  }

  const handleRestoreVersion = (versionId: string) => {
    const store = useSessionStore.getState()
    const sessionData = store.sessions.find(s => s.id === sessionId)
    if (!sessionData) return

    const version = sessionData.versions.find(v => v.id === versionId)
    if (!version) return

    store.updateSession(sessionId, {
      messages: [...version.messages]
    })
  }

  return (
    <div className="version-history">
      <div className="version-header">
        <h4>版本历史</h4>
        <button
          className="version-save-btn"
          onClick={() => setShowLabelInput(!showLabelInput)}
        >
          保存版本
        </button>
      </div>

      {showLabelInput && (
        <div className="version-label-input">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="版本标签（可选）"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()}
            autoFocus
          />
          <button onClick={handleSaveVersion}>保存</button>
        </div>
      )}

      <div className="version-list">
        {session.versions.length === 0 ? (
          <div className="version-empty">暂无保存的版本</div>
        ) : (
          [...session.versions].reverse().map(version => (
            <div key={version.id} className="version-item">
              <div className="version-info">
                <div className="version-label">{version.label}</div>
                <div className="version-meta">
                  {version.timestamp.toLocaleString()} · {version.messages.length} 条消息
                </div>
              </div>
              <button
                className="version-restore-btn"
                onClick={() => handleRestoreVersion(version.id)}
              >
                恢复
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
