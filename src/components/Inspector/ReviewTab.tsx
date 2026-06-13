import { useInspectorStore } from '../../stores/inspectorStore'

interface ReviewChecklistItem {
  label: string
  status: 'pending' | 'pass' | 'warn' | 'fail'
}

export function ReviewTab() {
  const { currentSessionDetail, detailLoading } = useInspectorStore()

  if (detailLoading) {
    return (
      <div className="inspector-loading">
        <div className="inspector-spinner" />
        <span>Loading session...</span>
      </div>
    )
  }

  const session = currentSessionDetail
  const messageCount = session?.messages?.length || 0
  const toolCalls = session?.messages?.filter((m: any) => m.role === 'tool')?.length || 0
  const errorMessages = session?.messages?.filter((m: any) => 
    m.role === 'system' || m.content?.toLowerCase().includes('error')
  )?.length || 0

  const checklist: ReviewChecklistItem[] = [
    { label: 'Session has messages', status: messageCount > 0 ? 'pass' : 'warn' },
    { label: 'Contains tool calls', status: toolCalls > 0 ? 'pass' : 'pending' },
    { label: 'No errors logged', status: errorMessages === 0 ? 'pass' : 'fail' },
    { label: 'Changes reviewed', status: session?.changes?.length > 0 ? 'pending' : 'pass' },
  ]

  const riskLevel = toolCalls > 10 ? 'high' : toolCalls > 5 ? 'medium' : 'low'

  return (
    <div className="inspector-review">
      {session ? (
        <>
          <div className="inspector-review-summary">
            <div className="inspector-summary-row">
              <span className="inspector-label">Session</span>
              <span className="inspector-value">{session.name || session.id}</span>
            </div>
            <div className="inspector-summary-row">
              <span className="inspector-label">Messages</span>
              <span className="inspector-value">{messageCount}</span>
            </div>
            <div className="inspector-summary-row">
              <span className="inspector-label">Tool calls</span>
              <span className="inspector-value">{toolCalls}</span>
            </div>
            <div className="inspector-summary-row">
              <span className="inspector-label">Risk</span>
              <span className={`inspector-risk risk-${riskLevel}`}>{riskLevel}</span>
            </div>
          </div>

          <div className="inspector-review-section">
            <div className="inspector-section-title">Review Checklist</div>
            {checklist.map((item, i) => (
              <div key={i} className="inspector-checklist-item">
                <span className={`inspector-check-icon status-${item.status}`}>
                  {item.status === 'pass' ? '✓' : item.status === 'fail' ? '✗' : item.status === 'warn' ? '!' : '○'}
                </span>
                <span className="inspector-check-label">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="inspector-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span>Select a session to review</span>
        </div>
      )}
    </div>
  )
}
