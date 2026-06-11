import { useState, KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (message: string) => void
  onCancel?: () => void
  disabled?: boolean
  isRunning?: boolean
}

export function MessageInput({ onSend, onCancel, disabled, isRunning }: MessageInputProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim() && !disabled && !isRunning) {
      onSend(input.trim())
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
        <div className="input-toolbar-left" />
        <div className="input-toolbar-right">
          {isRunning && onCancel ? (
            <button onClick={onCancel} className="cancel-button">取消</button>
          ) : (
            <button onClick={handleSend} disabled={disabled || !input.trim() || isRunning} className="send-btn">
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
