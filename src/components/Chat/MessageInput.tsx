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

  const handleKeyDown = (e: KeyboardEvent) => {
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
        placeholder={isRunning ? "AI is thinking..." : "Type a message..."}
        disabled={disabled || isRunning}
        rows={1}
      />
      {isRunning && onCancel ? (
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      ) : (
        <button onClick={handleSend} disabled={disabled || !input.trim() || isRunning}>
          Send
        </button>
      )}
    </div>
  )
}
