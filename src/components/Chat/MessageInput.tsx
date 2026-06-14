import { useEffect, useState, KeyboardEvent } from 'react'
import { SlashCommandMenu, SlashCommand } from './SlashCommandMenu'

type ExecutionMode = 'compose' | 'plan' | 'build'
type ReasoningVariant = 'default' | 'low' | 'medium' | 'high'

interface InputPrefs {
  mode: ExecutionMode
  permission: string
  model: string
  reasoning: ReasoningVariant
}

export const INPUT_PREFS_KEY = 'mimocode.inputPrefs'
const DEFAULT_MODEL = ''
const FALLBACK_MODELS = ['anthropic/claude-sonnet-4-5', 'openai/gpt-5.1-codex', 'google/gemini-3-pro']

export function readInputPrefs(): InputPrefs {
  if (typeof window === 'undefined') {
    return { mode: 'compose' as ExecutionMode, permission: 'edit', model: DEFAULT_MODEL, reasoning: 'default' }
  }

  try {
    const raw = window.localStorage.getItem(INPUT_PREFS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const mode = ['compose', 'plan', 'build'].includes(parsed.mode) ? parsed.mode as ExecutionMode : 'compose'
    const permission = ['readonly', 'edit', 'execute'].includes(parsed.permission) ? parsed.permission : 'edit'
    const model = typeof parsed.model === 'string' ? parsed.model : DEFAULT_MODEL
    const reasoning = ['default', 'low', 'medium', 'high'].includes(parsed.reasoning) ? parsed.reasoning as ReasoningVariant : 'default'
    return { mode, permission, model, reasoning }
  } catch {
    return { mode: 'compose' as ExecutionMode, permission: 'edit', model: DEFAULT_MODEL, reasoning: 'default' }
  }
}

interface MessageInputProps {
  onSend: (message: string, model: string, permission: string, reasoning: string, mode: string) => void
  onCancel?: () => void
  disabled?: boolean
  isRunning?: boolean
  onNewSession?: () => void
  onSetMode?: (mode: ExecutionMode) => void
  onOpenPlugins?: () => void
  onOpenWorkflow?: () => void
  onToggleStatus?: () => void
}

export function MessageInput({ onSend, onCancel, disabled, isRunning, onNewSession, onSetMode, onOpenPlugins, onOpenWorkflow, onToggleStatus }: MessageInputProps) {
  const [input, setInput] = useState('')
  const [prefs] = useState(readInputPrefs)
  const [model, setModel] = useState(prefs.model)
  const [permission, setPermission] = useState(prefs.permission)
  const [mode, setMode] = useState<ExecutionMode>(prefs.mode)
  const [reasoning, setReasoning] = useState<ReasoningVariant>(prefs.reasoning)
  const [models, setModels] = useState<string[]>(() => prefs.model ? [prefs.model] : FALLBACK_MODELS)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [attachedFile, setAttachedFile] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem(INPUT_PREFS_KEY, JSON.stringify({ mode, permission, model, reasoning }))
  }, [mode, permission, model, reasoning])

  useEffect(() => {
    let mounted = true
    window.electronAPI?.listModels?.().then(result => {
      if (!mounted || !result?.success || !result.models?.length) return
      const uniqueModels = Array.from(new Set(result.models))
      setModels(uniqueModels)
      if (!model) setModel(uniqueModels[0] || DEFAULT_MODEL)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    setShowSlashMenu(input.startsWith('/') && !input.includes(' '))
  }, [input])

  const handleSlashCommand = (cmd: SlashCommand) => {
    setShowSlashMenu(false)
    setInput('')
    switch (cmd.id) {
      case 'new':
        onNewSession?.()
        break
      case 'file':
        handleAttachFile()
        break
      case 'plan':
        setMode('plan')
        onSetMode?.('plan')
        break
      case 'build':
        setMode('build')
        onSetMode?.('build')
        break
      case 'plugins':
        onOpenPlugins?.()
        break
      case 'workflow':
        onOpenWorkflow?.()
        break
      case 'status':
        onToggleStatus?.()
        break
    }
  }

  const handleAttachFile = async () => {
    const api = window.electronAPI
    if (!api?.openFile) return
    const result = await api.openFile()
    if (result?.success && result.filePath) {
      const fileName = result.filePath.split(/[\\/]/).pop() || result.filePath
      setAttachedFile(fileName)
    }
  }

  const handleSend = () => {
    if (input.trim() && !disabled && !isRunning) {
      let message = `---\nmode: ${mode}\n---\n\n${input.trim()}`
      if (attachedFile) {
        message = `---\nfile: ${attachedFile}\n---\n\n${message}`
        setAttachedFile(null)
      }
      onSend(message, model, permission, reasoning, mode)
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="message-input">
      {showSlashMenu && (
        <SlashCommandMenu
          query={input}
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashMenu(false)}
        />
      )}
      {attachedFile && (
        <div className="attached-file">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>{attachedFile}</span>
          <button onClick={() => setAttachedFile(null)} title="移除附件">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? 'AI 正在思考...' : '描述你的需求或输入 / 查看命令...'}
        disabled={disabled || isRunning}
        rows={1}
        style={{ minHeight: 22 }}
      />
      <div className="input-toolbar">
        <div className="input-toolbar-left">
          <button className="attach-btn" title="添加附件" onClick={handleAttachFile}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <div className="mode-segment" aria-label="MiMo execution mode">
            <button
              type="button"
              className={mode === 'compose' ? 'active' : ''}
              onClick={() => { setMode('compose'); onSetMode?.('compose') }}
              title="Compose：整理想法与任务表达"
            >
              Compose
            </button>
            <button
              type="button"
              className={mode === 'plan' ? 'active' : ''}
              onClick={() => { setMode('plan'); onSetMode?.('plan') }}
              title="Plan：先拆解计划，不直接改代码"
            >
              Plan
            </button>
            <button
              type="button"
              className={mode === 'build' ? 'active' : ''}
              onClick={() => { setMode('build'); onSetMode?.('build') }}
              title="Build：执行实现与验证"
            >
              Build
            </button>
          </div>
          <select
            className="permission-select"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            title="访问权限"
          >
            <option value="readonly">只读</option>
            <option value="edit">工作区</option>
            <option value="execute">完全访问</option>
          </select>
        </div>
        <div className="input-toolbar-right">
          <select
            className="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            title="模型"
          >
            <option value="">默认模型</option>
            {models.map(item => (
              <option value={item} key={item}>{formatModelName(item)}</option>
            ))}
          </select>
          <select
            className="reasoning-select"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value as ReasoningVariant)}
            title="推理强度"
          >
            <option value="default">Default</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          {isRunning && onCancel ? (
            <button onClick={onCancel} className="cancel-button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ) : (
            <button onClick={handleSend} disabled={disabled || !input.trim() || isRunning} className="send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatModelName(model: string) {
  return model.replace(/^opencode\//, '').replace(/^mimo\//, '')
}
