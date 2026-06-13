import { useEffect, useState, KeyboardEvent } from 'react'

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
  onSend: (message: string, model: string, permission: string, reasoning: string) => void
  onCancel?: () => void
  disabled?: boolean
  isRunning?: boolean
}

export function MessageInput({ onSend, onCancel, disabled, isRunning }: MessageInputProps) {
  const [input, setInput] = useState('')
  const [prefs] = useState(readInputPrefs)
  const [model, setModel] = useState(prefs.model)
  const [permission, setPermission] = useState(prefs.permission)
  const [mode, setMode] = useState<ExecutionMode>(prefs.mode)
  const [reasoning, setReasoning] = useState<ReasoningVariant>(prefs.reasoning)
  const [models, setModels] = useState<string[]>(() => prefs.model ? [prefs.model] : FALLBACK_MODELS)

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

  const handleSend = () => {
    if (input.trim() && !disabled && !isRunning) {
      const modeLabel = mode === 'compose' ? 'Compose' : mode === 'plan' ? 'Plan' : 'Build'
      const message = `Mode: ${modeLabel}.\n\n${input.trim()}`
      onSend(message, model, permission, reasoning)
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="message-input">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? 'AI 正在思考...' : '描述你的需求...'}
        disabled={disabled || isRunning}
        rows={1}
        style={{ minHeight: 22 }}
      />
      <div className="input-toolbar">
        <div className="input-toolbar-left">
          <button className="attach-btn" title="添加附件">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <div className="mode-segment" aria-label="MiMo execution mode">
            <button
              type="button"
              className={mode === 'compose' ? 'active' : ''}
              onClick={() => setMode('compose')}
              title="Compose：整理想法与任务表达"
            >
              Compose
            </button>
            <button
              type="button"
              className={mode === 'plan' ? 'active' : ''}
              onClick={() => setMode('plan')}
              title="Plan：先拆解计划，不直接改代码"
            >
              Plan
            </button>
            <button
              type="button"
              className={mode === 'build' ? 'active' : ''}
              onClick={() => setMode('build')}
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
