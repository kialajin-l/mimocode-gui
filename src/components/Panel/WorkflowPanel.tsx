import { useWorkflowStore } from '../../stores/workflowStore'

interface WorkflowPanelProps {
  onSendMessage: (message: string) => void
  onClose?: () => void
}

export function WorkflowPanel({ onSendMessage, onClose }: WorkflowPanelProps) {
  const {
    workflows,
    currentStepIndex,
    isRunning,
    startWorkflow,
    advanceStep,
    stopWorkflow,
    getActiveWorkflow,
    getCurrentStep,
  } = useWorkflowStore()

  const activeWorkflow = getActiveWorkflow()
  const currentStep = getCurrentStep()

  if (isRunning && activeWorkflow) {
    const progress = ((currentStepIndex + 1) / activeWorkflow.steps.length) * 100

    return (
      <div className="workflow-panel">
        <div className="workflow-active">
          <div className="workflow-active-header">
            <h3>{activeWorkflow.name}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {onClose && (
                <button className="workflow-close-btn" onClick={onClose} title="返回工作台 (Esc)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              <button className="workflow-stop-btn" onClick={stopWorkflow} title="停止工作流">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="workflow-progress-bar">
            <div className="workflow-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="workflow-progress-text">
            第 {currentStepIndex + 1} / {activeWorkflow.steps.length} 步
          </div>

          <div className="workflow-steps-list">
            {activeWorkflow.steps.map((step, i) => (
              <div
                key={step.id}
                className={`workflow-step-item ${i < currentStepIndex ? 'completed' : ''} ${i === currentStepIndex ? 'current' : ''}`}
              >
                <div className="workflow-step-indicator">
                  {i < currentStepIndex ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <span className="workflow-step-num">{i + 1}</span>
                  )}
                </div>
                <div className="workflow-step-info">
                  <div className="workflow-step-name">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          {currentStep && (
            <div className="workflow-current-action">
              <div className="workflow-current-label">当前步骤</div>
              <div className="workflow-current-desc">{currentStep.description}</div>
              <button
                className="workflow-run-step-btn"
                onClick={() => {
                  onSendMessage(currentStep.prompt)
                  advanceStep()
                }}
              >
                {currentStepIndex === activeWorkflow.steps.length - 1 ? '执行最后一步' : '执行并继续'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="workflow-panel">
      <div className="workflow-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>自动化工作流</h3>
          {onClose && (
            <button className="workflow-close-btn" onClick={onClose} title="返回工作台 (Esc)" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        {workflows.map(workflow => (
          <div key={workflow.id} className="workflow-card">
            <div className="workflow-card-header">
              <h3 className="workflow-card-name">{workflow.name}</h3>
              <span className="workflow-card-steps">{workflow.steps.length} 步</span>
            </div>
            <p className="workflow-card-desc">{workflow.description}</p>
            <div className="workflow-card-preview">
              {workflow.steps.map((step, i) => (
                <div key={step.id} className="workflow-card-step">
                  <span className="workflow-card-step-num">{i + 1}</span>
                  <span className="workflow-card-step-text">{step.description}</span>
                </div>
              ))}
            </div>
            <button
              className="workflow-card-start-btn"
              onClick={() => {
                startWorkflow(workflow.id)
                const firstStep = workflow.steps[0]
                if (firstStep) {
                  onSendMessage(firstStep.prompt)
                  advanceStep()
                }
              }}
            >
              开始工作流
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
