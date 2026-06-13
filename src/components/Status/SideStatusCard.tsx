import { useState, useEffect } from 'react'
import { Session, Project } from '../../types/session'
import { readInputPrefs } from '../Chat/MessageInput'

interface SideStatusCardProps {
  session?: Session
  project?: Project
}

export function SideStatusCard({ session, project }: SideStatusCardProps) {
  const cwd = session?.cwd || project?.cwd || '未选择工作区'
  const changes = session?.changes || []
  const messageCount = session?.messages.length || 0
  const prefs = readInputPrefs()
  const estimatedTokens = Math.max(0, session?.messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 3.6), 0) || 0)
  const contextLimit = 495_990
  const contextUsed = Math.min(100, Math.round((estimatedTokens / contextLimit) * 100))
  const tasks = buildTasks(messageCount, changes.length)
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'disconnected'>('disconnected')

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.getMimoPath().then(mimoPath => {
      if (mimoPath) {
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
        <p>{contextLimit.toLocaleString()} tokens</p>
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

      <div className="status-terminal-section">
        <h4>LSP</h4>
        <p>待接入</p>
      </div>

      <div className="status-terminal-section">
        <h4>Goal</h4>
        <p><span className="orange-dot" /> 当前未设置目标</p>
      </div>

      <div className="status-terminal-section">
        <h4>▼ Tasks (估算)</h4>
        {tasks.map(task => <p key={task}>[·] {task}</p>)}
        <p>▸ {Math.max(0, messageCount - tasks.length)} more done</p>
      </div>

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

function buildTasks(messageCount: number, changeCount: number) {
  const tasks = ['准备项目上下文', '读取会话状态']
  if (messageCount > 0) tasks.push('处理用户任务')
  if (changeCount > 0) tasks.push('检查修改文件')
  return tasks
}
