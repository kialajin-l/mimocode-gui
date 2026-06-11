import { useState } from 'react'

interface RightPanelProps {
  open: boolean
  onToggle: () => void
}

export function RightPanel({ open }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'terminal'>('review')

  return (
    <aside className={`right-panel ${open ? 'open' : ''}`}>
      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          审查
        </button>
        <button
          className={`panel-tab ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          终端
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'review' && <ReviewPanel />}
        {activeTab === 'terminal' && <TerminalPanel />}
      </div>
    </aside>
  )
}

function ReviewPanel() {
  return (
    <div className="review-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span>暂无审查内容</span>
      <span style={{ fontSize: 11 }}>AI 修改文件后将在此显示 Diff</span>
    </div>
  )
}

function TerminalPanel() {
  const [lines, setLines] = useState<string[]>([
    '$ ',
  ])
  const [input, setInput] = useState('')

  const handleInput = () => {
    if (!input.trim()) return
    setLines(prev => [...prev.slice(0, -1), `$ ${input}`, ''])
    setInput('')
  }

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-tabs">
          <button className="terminal-tab active">bash</button>
        </div>
        <span style={{ fontSize: 11 }}>mimocode-gui</span>
      </div>
      <div className="terminal-body">
        {lines.map((line, i) => (
          <div key={i} className="terminal-line">
            {line.startsWith('$') ? (
              <><span className="prompt">{line.charAt(0)}</span>{line.slice(1)}</>
            ) : (
              <span className="output">{line}</span>
            )}
          </div>
        ))}
        <div className="terminal-input-line">
          <span className="prompt">$ </span>
          <input
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInput()}
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
