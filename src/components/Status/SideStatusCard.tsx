import { useState, useEffect } from 'react'
import { Session, Project } from '../../types/session'
import { readInputPrefs } from '../Chat/MessageInput'

interface SideStatusCardProps {
  session?: Session
  project?: Project
}

const CONTEXT_LIMIT = 495_990
const CHARS_PER_TOKEN = 3.6

export function SideStatusCard({ session, project }: SideStatusCardProps) {
  const cwd = session?.cwd || project?.cwd || '未选择工作区'
  const changes = session?.changes || []
  const messageCount = session?.messages.length || 0
  const prefs = readInputPrefs()
  const estimatedTokens = Math.max(0, session?.messages.reduce((sum, message) => sum + Math.ceil(message.content.length / CHARS_PER_TOKEN), 0) || 0)
  const contextUsed = Math.min(100, Math.round((estimatedTokens / CONTEXT_LIMIT) * 100))

  const [mcpStatus, setMcpStatus] = useState<'connected' | 'disconnected'>('disconnected')

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.getMimoPath().then(mimoPath => {
      if (mimoPath && !mimoPath.includes('..') && (/^[A-Za-z]:/.test(mimoPath) || mimoPath.startsWith('/'))) {
        api.readFile(`${mimoPath}/mcp.json`).then(result => {
          if (result?.success && result.content) {
            try {
              const config = JSON.parse(result.content)
              if (config && Object.keys(config).length > 0) {
                setMcpStatus('connected')
              }
            } catch {}
          }
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  return (
    <aside className="side-status-card" aria-label="MiMo 状态信息">
      <div className="side-status-header">
        <div>
          <strong>{session?.name || 'MiMoCode 工作台'}</strong>
          <code>{session?.id?.slice(0, 22) || '未创建会话'}</code>
        </div>
      </div>

      <div className="status-terminal-section">
        <h4>Context</h4>
        <p>{CONTEXT_LIMIT.toLocaleString()} tokens</p>
        <p>{contextUsed}% used (估算)</p>
        <p>{session?.status === 'running' ? '运行中' : session?.status === 'error' ? '异常' : '空闲'}</p>
        <p>{estimatedTokens.toLocaleString()} tokens 已使用 (估算)</p>
      </div>

      <div className="status-terminal-section">
        <h4>工作目录</h4>
        <code title={cwd}>{cwd}</code>
      </div>

      <div className="status-terminal-section">
        <h4>指令档案</h4>
        <p><span className="orange-dot" /> 当前项目: {cwd}</p>
      </div>

      <div className="status-terminal-section">
        <h4>MCP</h4>
        <p>
          <span className={mcpStatus === 'connected' ? 'green-dot' : 'yellow-dot'} />
          {' '}codegraph <em>{mcpStatus === 'connected' ? '已连接' : '待接入'}</em>
        </p>
      </div>

      {/* LSP not yet integrated — waiting for language server protocol support */}
      <div className="status-terminal-section">
        <h4>LSP</h4>
        <p>待接入</p>
      </div>

      <div className="status-terminal-section">
        <h4>Goal</h4>
        <p><span className="orange-dot" /> 当前未设置目标</p>
      </div>

      {messageCount > 0 && (
        <div className="status-terminal-section">
          <h4>▼ Tasks (估算)</h4>
          <p>{messageCount} 条消息已处理</p>
        </div>
      )}

      <div className="status-terminal-section">
        <h4>▸ Modified Files</h4>
        <p>{changes.length > 0 ? `${changes.length} 个文件已修改` : '暂无修改文件'}</p>
      </div>

      <div className="status-terminal-footer">
        <span>{prefs.model || '默认模型'}</span>
        <span>{prefs.reasoning}</span>
      </div>
    </aside>
  )
}

