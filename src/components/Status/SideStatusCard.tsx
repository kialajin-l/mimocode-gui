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
  const tasks = buildTasks(session?.messages.length || 0, changes.length)

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
        <p>{contextUsed}% used</p>
        <p>{session?.status === 'running' ? 'running' : 'idle'}</p>
        <p>$0.00 spent</p>
      </div>

      <div className="status-terminal-section">
        <h4>工作目录</h4>
        <code title={cwd}>{cwd}</code>
      </div>

      <div className="status-terminal-section">
        <h4>指令档案</h4>
        <p><span className="orange-dot" /> ~/.codex/AGENTS.md</p>
        <p><span className="orange-dot" /> 项目 AGENTS.md</p>
      </div>

      <div className="status-terminal-section">
        <h4>MCP</h4>
        <p><span className="yellow-dot" /> codegraph <em>已连接</em></p>
      </div>

      <div className="status-terminal-section">
        <h4>LSP</h4>
        <p>LSPs will activate as files are read</p>
      </div>

      <div className="status-terminal-section">
        <h4>Goal</h4>
        <p><span className="orange-dot" /> {project?.name ? `${project.name}: active` : 'Judge: pending'}</p>
      </div>

      <div className="status-terminal-section">
        <h4>▼ Tasks</h4>
        {tasks.map(task => <p key={task}>[✓] {task}</p>)}
        <p>▸ {Math.max(0, messageCount - tasks.length)} more done</p>
      </div>

      <div className="status-terminal-section">
        <h4>▸ Modified Files</h4>
        <p>{changes.length > 0 ? `${changes.length} files changed` : 'No modified files'}</p>
      </div>

      <div className="status-terminal-footer">
        <span>{prefs.model || 'default model'}</span>
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
