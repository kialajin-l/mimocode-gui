import { useState } from 'react'
import { FileChange } from '../../utils/diffParser'
import { DiffViewer } from './DiffViewer'

interface RightPanelProps {
  open: boolean
  onToggle: () => void
  changes: FileChange[]
}

export function RightPanel({ open, changes }: RightPanelProps) {
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
        {activeTab === 'review' && <DiffViewer changes={changes} />}
        {activeTab === 'terminal' && <TerminalPanel />}
      </div>
    </aside>
  )
}

function TerminalPanel() {
  const [lines, setLines] = useState<string[]>(['$ '])
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
