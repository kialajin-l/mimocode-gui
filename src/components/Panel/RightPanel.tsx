import { useState, useRef, useEffect } from 'react'
import { FileChange } from '../../utils/diffParser'
import { DiffViewer } from './DiffViewer'
import { VersionHistory } from './VersionHistory'
import { BookmarksPanel } from './BookmarksPanel'
import { InspectorPanel } from '../Inspector/InspectorPanel'
import { useInspectorStore } from '../../stores/inspectorStore'

interface RightPanelProps {
  open: boolean
  changes: FileChange[]
  sessionId?: string
  onAcceptChange?: (file: string) => void
  onRejectChange?: (file: string) => void
}

type CodeTab = 'review' | 'terminal' | 'versions' | 'bookmarks' | 'inspector'

export function RightPanel({ open, changes, sessionId, onAcceptChange, onRejectChange }: RightPanelProps) {
  const [codeTab, setCodeTab] = useState<CodeTab>('review')
  const { fetchSessions } = useInspectorStore()

  useEffect(() => {
    if (open && codeTab === 'inspector') {
      fetchSessions()
    }
  }, [open, codeTab, fetchSessions])

  return (
    <aside className={`right-panel ${open ? 'open' : ''}`}>
      <div className="panel-tabs">
        <button
          className={`panel-tab ${codeTab === 'review' ? 'active' : ''}`}
          onClick={() => setCodeTab('review')}
        >
          审查
        </button>
        <button
          className={`panel-tab ${codeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setCodeTab('terminal')}
        >
          终端
        </button>
        {sessionId && (
          <>
            <button
              className={`panel-tab ${codeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setCodeTab('inspector')}
            >
              检查器
            </button>
            <button
              className={`panel-tab ${codeTab === 'versions' ? 'active' : ''}`}
              onClick={() => setCodeTab('versions')}
            >
              会话版本
            </button>
            <button
              className={`panel-tab ${codeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setCodeTab('bookmarks')}
            >
              书签
            </button>
          </>
        )}
      </div>

      <div className="panel-content">
        {codeTab === 'review' && (
          <DiffViewer
            changes={changes}
            onAccept={onAcceptChange}
            onReject={onRejectChange}
          />
        )}
        {codeTab === 'terminal' && <TerminalPanel />}
        {codeTab === 'inspector' && sessionId && <InspectorPanel />}
        {codeTab === 'versions' && sessionId && (
          <VersionHistory sessionId={sessionId} />
        )}
        {codeTab === 'bookmarks' && sessionId && (
          <BookmarksPanel sessionId={sessionId} />
        )}
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
    { type: 'output', content: '就绪。输入命令后按回车执行。' }
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
        setLines(prev => [...prev, { type: 'exit', content: `进程退出，代码 ${code}` }])
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
      setLines(prev => [...prev, { type: 'error', content: '终端不可用（浏览器模式）' }])
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
            placeholder={isRunning ? '运行中...' : ''}
            disabled={isRunning}
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
