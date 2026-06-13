import { useState, useRef, useEffect } from 'react'
import { FileChange } from '../../utils/diffParser'
import { DiffViewer } from './DiffViewer'
import { VersionHistory } from './VersionHistory'
import { BookmarksPanel } from './BookmarksPanel'
import { InspectorPanel } from '../Inspector/InspectorPanel'
import { useInspectorStore } from '../../stores/inspectorStore'
import { OutlinePanel } from '../Writing/OutlinePanel'
import { CharacterPanel } from '../Writing/CharacterPanel'
import { WorldPanel } from '../Writing/WorldPanel'

interface RightPanelProps {
  open: boolean
  changes: FileChange[]
  sessionId?: string
  onAcceptChange?: (file: string) => void
  onRejectChange?: (file: string) => void
}

type PanelMode = 'code' | 'writing'
type CodeTab = 'review' | 'terminal' | 'versions' | 'bookmarks' | 'inspector'
type WritingTab = 'outline' | 'characters' | 'world'

export function RightPanel({ open, changes, sessionId, onAcceptChange, onRejectChange }: RightPanelProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>('code')
  const [codeTab, setCodeTab] = useState<CodeTab>('review')
  const [writingTab, setWritingTab] = useState<WritingTab>('outline')
  const { fetchSessions } = useInspectorStore()

  useEffect(() => {
    if (open && codeTab === 'inspector') {
      fetchSessions()
    }
  }, [open, codeTab, fetchSessions])

  return (
    <aside className={`right-panel ${open ? 'open' : ''}`}>
      <div className="panel-mode-switch">
        <button
          className={`panel-mode-btn ${panelMode === 'code' ? 'active' : ''}`}
          onClick={() => setPanelMode('code')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          代码
        </button>
        <button
          className={`panel-mode-btn ${panelMode === 'writing' ? 'active' : ''}`}
          onClick={() => setPanelMode('writing')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          写作
        </button>
      </div>

      <div className="panel-tabs">
        {panelMode === 'code' ? (
          <>
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
            <button
              className={`panel-tab ${codeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setCodeTab('inspector')}
            >
              Inspector
            </button>
            {sessionId && (
              <>
                <button
                  className={`panel-tab ${codeTab === 'versions' ? 'active' : ''}`}
                  onClick={() => setCodeTab('versions')}
                >
                  版本
                </button>
                <button
                  className={`panel-tab ${codeTab === 'bookmarks' ? 'active' : ''}`}
                  onClick={() => setCodeTab('bookmarks')}
                >
                  书签
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              className={`panel-tab ${writingTab === 'outline' ? 'active' : ''}`}
              onClick={() => setWritingTab('outline')}
            >
              大纲
            </button>
            <button
              className={`panel-tab ${writingTab === 'characters' ? 'active' : ''}`}
              onClick={() => setWritingTab('characters')}
            >
              角色
            </button>
            <button
              className={`panel-tab ${writingTab === 'world' ? 'active' : ''}`}
              onClick={() => setWritingTab('world')}
            >
              世界观
            </button>
          </>
        )}
      </div>

      <div className="panel-content">
        {panelMode === 'code' && (
          <>
            {codeTab === 'review' && (
              <DiffViewer
                changes={changes}
                onAccept={onAcceptChange}
                onReject={onRejectChange}
              />
            )}
            {codeTab === 'terminal' && <TerminalPanel />}
            {codeTab === 'inspector' && (
              <InspectorPanel
                changes={changes}
                onAcceptChange={onAcceptChange}
                onRejectChange={onRejectChange}
              />
            )}
            {codeTab === 'versions' && sessionId && (
              <VersionHistory sessionId={sessionId} />
            )}
            {codeTab === 'bookmarks' && sessionId && (
              <BookmarksPanel sessionId={sessionId} />
            )}
          </>
        )}
        {panelMode === 'writing' && (
          <>
            {writingTab === 'outline' && <OutlinePanel />}
            {writingTab === 'characters' && <CharacterPanel />}
            {writingTab === 'world' && <WorldPanel />}
          </>
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
