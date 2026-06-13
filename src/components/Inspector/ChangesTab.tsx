import { FileChange } from '../../utils/diffParser'

interface ChangesTabProps {
  changes: FileChange[]
  onAccept?: (file: string) => void
  onReject?: (file: string) => void
}

export function ChangesTab({ changes, onAccept, onReject }: ChangesTabProps) {
  if (changes.length === 0) {
    return (
      <div className="inspector-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>No changes yet</span>
        <span style={{ fontSize: 11 }}>Changes will appear here</span>
      </div>
    )
  }

  return (
    <div className="inspector-changes">
      {changes.map((change, i) => (
        <div key={i} className="inspector-change-item">
          <div className="inspector-change-header">
            <span className={`inspector-file-status ${change.status}`}>
              {change.status === 'created' ? 'A' : change.status === 'deleted' ? 'D' : 'M'}
            </span>
            <span className="inspector-file-path">{change.file}</span>
          </div>
          <div className="inspector-change-stats">
            <span className="inspector-stat-added">+{change.additions}</span>
            <span className="inspector-stat-removed">-{change.deletions}</span>
          </div>
          {(onAccept || onReject) && (
            <div className="inspector-change-actions">
              {onAccept && (
                <button
                  className="inspector-action-btn accept"
                  onClick={() => onAccept(change.file)}
                  title="Accept"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
              {onReject && (
                <button
                  className="inspector-action-btn reject"
                  onClick={() => onReject(change.file)}
                  title="Reject"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
