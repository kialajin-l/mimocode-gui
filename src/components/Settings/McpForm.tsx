import { useState } from 'react'

interface McpFormProps {
  initial?: {
    name?: string
    command?: string
    args?: string[]
    env?: Record<string, string>
  }
  onSubmit: (data: { name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean }) => void
  onCancel: () => void
}

export function McpForm({ initial, onSubmit, onCancel }: McpFormProps) {
  const [name, setName] = useState(initial?.name || '')
  const [command, setCommand] = useState(initial?.command || '')
  const [argsStr, setArgsStr] = useState(initial?.args?.join(' ') || '')
  const [envStr, setEnvStr] = useState(
    initial?.env ? Object.entries(initial.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  )

  const handleSubmit = () => {
    if (!name.trim() || !command.trim()) return
    const args = argsStr.trim() ? argsStr.trim().split(/\s+/) : []
    let env: Record<string, string> | undefined
    if (envStr.trim()) {
      env = {}
      for (const line of envStr.trim().split('\n')) {
        const eqIdx = line.indexOf('=')
        if (eqIdx > 0) {
          env[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim()
        }
      }
      if (Object.keys(env).length === 0) env = undefined
    }
    onSubmit({ name: name.trim(), command: command.trim(), args, env, enabled: true })
  }

  return (
    <div className="mcp-form">
      <div className="mcp-form-row">
        <label>名称</label>
        <input
          type="text"
          className="mcp-form-input"
          placeholder="例如：filesystem"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div className="mcp-form-row">
        <label>命令</label>
        <input
          type="text"
          className="mcp-form-input"
          placeholder="例如：npx 或 /usr/bin/node"
          value={command}
          onChange={e => setCommand(e.target.value)}
        />
      </div>
      <div className="mcp-form-row">
        <label>参数</label>
        <input
          type="text"
          className="mcp-form-input"
          placeholder="空格分隔，例如：-y @modelcontextprotocol/server-filesystem /tmp"
          value={argsStr}
          onChange={e => setArgsStr(e.target.value)}
        />
      </div>
      <div className="mcp-form-row">
        <label>环境变量</label>
        <textarea
          className="mcp-form-textarea"
          placeholder="每行一个 KEY=VALUE"
          rows={3}
          value={envStr}
          onChange={e => setEnvStr(e.target.value)}
        />
      </div>
      <div className="mcp-form-actions">
        <button className="mcp-form-cancel" onClick={onCancel}>取消</button>
        <button className="mcp-form-submit" onClick={handleSubmit} disabled={!name.trim() || !command.trim()}>
          {initial ? '保存' : '添加'}
        </button>
      </div>
    </div>
  )
}
