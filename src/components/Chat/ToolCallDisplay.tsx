import { useState } from 'react'

interface ToolCall {
  name: string
  args?: Record<string, unknown>
  result?: string
}

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (toolCalls.length === 0) return null

  return (
    <div className="tool-calls">
      <div className="tool-calls-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span>工具调用 ({toolCalls.length})</span>
      </div>
      {toolCalls.map((call, i) => (
        <ToolCallItem key={i} call={call} />
      ))}
    </div>
  )
}

function ToolCallItem({ call }: { call: ToolCall }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="tool-call">
      <div
        className="tool-call-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="tool-call-name">{call.name}</div>
        <div className="tool-call-toggle">
          {expanded ? '▼' : '▶'}
        </div>
      </div>
      {expanded && (
        <div className="tool-call-details">
          {call.args && (
            <div className="tool-call-args">
              <div className="tool-call-label">参数</div>
              <pre>{JSON.stringify(call.args, null, 2)}</pre>
            </div>
          )}
          {call.result && (
            <div className="tool-call-result">
              <div className="tool-call-label">结果</div>
              <pre>{call.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
