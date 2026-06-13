import { useState } from 'react'
import { useInspectorStore } from '../../stores/inspectorStore'

export function ContextTab() {
  const { memory, checkpoints, contextLoading } = useInspectorStore()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'memory' | 'checkpoints'>('memory')

  const toggleExpand = (id: string) => {
    setExpandedItem(prev => prev === id ? null : id)
  }

  if (contextLoading) {
    return (
      <div className="inspector-loading">
        <div className="inspector-spinner" />
        <span>Loading context...</span>
      </div>
    )
  }

  return (
    <div className="inspector-context">
      <div className="inspector-section-tabs">
        <button
          className={`inspector-section-tab ${activeSection === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveSection('memory')}
        >
          Memory ({memory.length})
        </button>
        <button
          className={`inspector-section-tab ${activeSection === 'checkpoints' ? 'active' : ''}`}
          onClick={() => setActiveSection('checkpoints')}
        >
          Checkpoints ({checkpoints.length})
        </button>
      </div>

      {activeSection === 'memory' && (
        <div className="inspector-list">
          {memory.length === 0 ? (
            <div className="inspector-empty-small">No memory files</div>
          ) : (
            memory.map((file, i) => (
              <div key={i} className="inspector-list-item">
                <button
                  className="inspector-list-header"
                  onClick={() => toggleExpand(`mem-${i}`)}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    className={`inspector-chevron ${expandedItem === `mem-${i}` ? 'expanded' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="inspector-item-name">{file.name}</span>
                </button>
                {expandedItem === `mem-${i}` && (
                  <div className="inspector-list-content">
                    <pre className="inspector-code">{file.content}</pre>
                    <div className="inspector-item-meta">
                      {new Date(file.mtime).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'checkpoints' && (
        <div className="inspector-list">
          {checkpoints.length === 0 ? (
            <div className="inspector-empty-small">No checkpoints</div>
          ) : (
            checkpoints.map((file, i) => (
              <div key={i} className="inspector-list-item">
                <button
                  className="inspector-list-header"
                  onClick={() => toggleExpand(`cp-${i}`)}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    className={`inspector-chevron ${expandedItem === `cp-${i}` ? 'expanded' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="inspector-item-name">{file.name}</span>
                </button>
                {expandedItem === `cp-${i}` && (
                  <div className="inspector-list-content">
                    <pre className="inspector-code">{file.content}</pre>
                    <div className="inspector-item-meta">
                      {new Date(file.mtime).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
