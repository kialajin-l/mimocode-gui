import { useState, KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (message: string, model: string, permission: string) => void
  onCancel?: () => void
  disabled?: boolean
  isRunning?: boolean
}

export function MessageInput({ onSend, onCancel, disabled, isRunning }: MessageInputProps) {
  const [input, setInput] = useState('')
  const [model, setModel] = useState('mimo-auto')
  const [permission, setPermission] = useState('edit')

  const handleSend = () => {
    if (input.trim() && !disabled && !isRunning) {
      onSend(input.trim(), model, permission)
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
        placeholder={isRunning ? "AI is thinking..." : "描述你的需求..."}
        disabled={disabled || isRunning}
        rows={1}
        style={{ minHeight: 22 }}
      />
      <div className="input-toolbar">
        <div className="input-toolbar-left">
          <button className="attach-btn" title="添加附件">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <select
            className="permission-select"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
          >
            <option value="readonly">只读</option>
            <option value="edit">允许编辑</option>
            <option value="execute">允许执行</option>
          </select>
        </div>
        <div className="input-toolbar-right">
          <select
            className="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="mimo-auto">MiMo Auto</option>
            <option value="mimo-pro">MiMo Pro</option>
            <option value="mimo-lite">MiMo Lite</option>
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
