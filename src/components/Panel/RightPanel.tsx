import { useState, useRef, useEffect } from 'react'
import { FileChange } from '../../utils/diffParser'
import { DiffViewer } from './DiffViewer'

interface RightPanelProps {
  open: boolean
  changes: FileChange[]
  onAcceptChange?: (file: string) => void
  onRejectChange?: (file: string) => void
}

export function RightPanel({ open, changes, onAcceptChange, onRejectChange }: RightPanelProps) {
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
        {activeTab === 'review' && (
          <DiffViewer
            changes={changes}
            onAccept={onAcceptChange}
            onReject={onRejectChange}
          />
        )}
        {activeTab === 'terminal' && <TerminalPanel />}
      </div>
    </aside>
  )
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'exit'
  content: string
}

function TerminalPanel() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', content: 'Ready. Type a command and press Enter.' }
  ])
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`term-${Date.now()}`)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const id = idRef.current

    api.onTerminalOutput(id, (data) => {
      setLines(prev => [...prev, { type: 'output', content: data }])
    })

    const cleanupExit = api.onTerminalExit(id, (code) => {
      setIsRunning(false)
      if (code !== 0 && code !== null) {
        setLines(prev => [...prev, { type: 'exit', content: `Process exited with code ${code}` }])
      }
    })

    return () => {
      cleanupExit()
      api.removeTerminalListeners(id)
    }
  }, [])

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [lines])

  const handleExecute = async () => {
    if (!input.trim() || isRunning) return

    const command = input.trim()
    setInput('')
    setLines(prev => [...prev, { type: 'input', content: `$ ${command}` }])

    if (command === 'clear') {
      setLines([])
      return
    }

    const api = window.electronAPI
    if (!api) {
      setLines(prev => [...prev, { type: 'error', content: 'Terminal not available (browser mode)' }])
      return
    }

    setIsRunning(true)
    await api.terminalExecute(idRef.current, command)
  }

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-tabs">
          <button className="terminal-tab active">bash</button>
        </div>
        <span style={{ fontSize: 11 }}>mimocode-gui</span>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {lines.map((line, i) => (
          <div key={i} className="terminal-line">
            {line.type === 'input' ? (
              <><span className="prompt">{line.content.charAt(0)}</span>{line.content.slice(1)}</>
            ) : line.type === 'error' ? (
              <span style={{ color: 'var(--error-color)' }}>{line.content}</span>
            ) : line.type === 'exit' ? (
              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{line.content}</span>
            ) : (
              <span className="output">{line.content}</span>
            )}
          </div>
        ))}
        <div className="terminal-input-line">
          <span className="prompt">$ </span>
          <input
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
            placeholder={isRunning ? 'Running...' : ''}
            disabled={isRunning}
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
