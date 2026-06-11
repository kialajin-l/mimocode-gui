interface ToolCall {
  name: string
  args: Record<string, unknown>
  result?: string
}

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (toolCalls.length === 0) return null

  return (
    <div className="tool-calls">
      <div className="tool-calls-header">Tool Calls</div>
      {toolCalls.map((call, index) => (
        <div key={index} className="tool-call">
          <div className="tool-call-name">{call.name}</div>
          <pre className="tool-call-args">{JSON.stringify(call.args, null, 2)}</pre>
          {call.result && (
            <div className="tool-call-result">
              <strong>Result:</strong> {call.result}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
