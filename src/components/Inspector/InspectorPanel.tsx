import { useState } from 'react'
import { FileChange } from '../../utils/diffParser'
import { ChangesTab } from './ChangesTab'
import { ContextTab } from './ContextTab'
import { ReviewTab } from './ReviewTab'

interface InspectorPanelProps {
  changes?: FileChange[]
  onAcceptChange?: (file: string) => void
  onRejectChange?: (file: string) => void
}

type InspectorTab = 'changes' | 'context' | 'review'

export function InspectorPanel({ changes = [], onAcceptChange, onRejectChange }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('review')

  return (
    <div className="inspector-panel">
      <div className="inspector-tabs">
        <button
          className={`inspector-tab ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          变更
        </button>
        <button
          className={`inspector-tab ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          上下文
        </button>
        <button
          className={`inspector-tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          审查
        </button>
      </div>

      <div className="inspector-content">
        {activeTab === 'changes' && (
          <ChangesTab
            changes={changes}
            onAccept={onAcceptChange}
            onReject={onRejectChange}
          />
        )}
        {activeTab === 'context' && <ContextTab />}
        {activeTab === 'review' && <ReviewTab />}
      </div>
    </div>
  )
}
