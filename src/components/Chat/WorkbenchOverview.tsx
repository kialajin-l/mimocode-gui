import { useEffect, useMemo, useState, useRef } from 'react'
import { Message } from '../../types/session'
import { useInspectorStore } from '../../stores/inspectorStore'

interface WorkbenchOverviewProps {
  sessionName: string
  status?: 'running' | 'idle' | 'error'
  messages: Message[]
  cwd?: string
}

export function WorkbenchOverview({ sessionName, status = 'idle', messages, cwd }: WorkbenchOverviewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const userMessages = messages.filter(message => message.role === 'user').length
  const assistantMessages = messages.filter(message => message.role === 'assistant').length
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')
  const mode = getModeFromMessage(lastUserMessage?.content)
  const { memory, checkpoints, contextLoading, readProjectContext } = useInspectorStore()
  const distillReady = userMessages >= 6
  const distillState = distillReady ? '可复盘沉淀' : '积累工作流轨迹'
  const statusLabel = status === 'running' ? '运行中' : status === 'error' ? '需要处理' : '就绪'
  const contextSummary = contextLoading ? '扫描中' : `${memory.length}/${checkpoints.length}`
  const projectFiles = useMemo(() => ({
    memory: memory.slice(0, 4).map(file => file.name),
    checkpoints: checkpoints.slice(0, 4).map(file => file.name)
  }), [memory, checkpoints])

  useEffect(() => {
    if (cwd) {
      readProjectContext(cwd)
    }
  }, [cwd, readProjectContext])

  // Detect narrow width via ResizeObserver on the top-bar-left container
  useEffect(() => {
    const el = containerRef.current?.parentElement
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCompact(entry.contentRect.width < 560)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (compact) {
    return (
      <section className="workbench-overview workbench-overview-compact" ref={containerRef} aria-label="MiMo 工作台状态">
        <button
          type="button"
          className="workbench-compact-btn"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(prev => !prev)}
          title={`MiMo 状态 · ${statusLabel}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </button>
        {drawerOpen && (
          <div className="workbench-drawer" role="dialog" aria-label="MiMo 工作台详情">
            <div className="workbench-drawer-header">
              <div>
                <strong>工作台状态详情</strong>
                <p>{sessionName} · {mode ? `当前使用 ${mode} 模式。` : '默认使用 Compose，可在底部输入框切换 Plan / Build。'}</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)}>关闭</button>
            </div>
            <div className="workbench-drawer-grid">
              <div className="workbench-drawer-card">
                <div className="mimo-intelligence-title">
                  <span className="mimo-intelligence-dot dream" />
                  Dream 记忆
                </div>
                <strong>{contextLoading ? '正在扫描…' : `${memory.length} 记忆 / ${checkpoints.length} 检查点`}</strong>
                <p>/dream 会扫描近期会话轨迹，把稳定的项目知识沉淀到长期记忆，并清理过期内容。</p>
                <FileList title="记忆文件" files={projectFiles.memory} empty="暂无记忆文件" />
                <FileList title="检查点" files={projectFiles.checkpoints} empty="暂无检查点" />
              </div>
              <div className="workbench-drawer-card">
                <div className="mimo-intelligence-title">
                  <span className="mimo-intelligence-dot distill" />
                  Distill 技能
                </div>
                <strong>{distillState}</strong>
                <p>/distill 会观察重复出现的手工工作流，将高置信候选沉淀为可复用的技能、子代理或命令。</p>
                <p className="workbench-drawer-note">后续可在这里展示 skill 候选、触发条件与沉淀状态。</p>
              </div>
              <div className="workbench-drawer-card compact">
                <strong>会话指标</strong>
                <div className="workbench-metric-row">
                  <span>提示</span>
                  <b>{userMessages}</b>
                </div>
                <div className="workbench-metric-row">
                  <span>回复</span>
                  <b>{assistantMessages}</b>
                </div>
                <div className="workbench-metric-row">
                  <span>状态</span>
                  <b>{statusLabel}</b>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="workbench-overview" ref={containerRef} aria-label="MiMo 工作台状态">
      <button
        type="button"
        className="workbench-status-strip"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(prev => !prev)}
      >
        <span className="workbench-strip-title">
          <span className="workbench-overview-kicker">MiMo 状态</span>
        </span>
        <span className="workbench-strip-chips">
          <span className="workbench-chip">{mode || 'Compose'}</span>
          <span className={`workbench-status ${status}`}>{statusLabel}</span>
          <span className="workbench-chip dream">Dream {contextSummary}</span>
          <span className="workbench-chip distill">Distill</span>
        </span>
        <span className="workbench-strip-action">{drawerOpen ? '' : '▾'}</span>
      </button>

      {drawerOpen && (
        <div className="workbench-drawer" role="dialog" aria-label="MiMo 工作台详情">
          <div className="workbench-drawer-header">
            <div>
              <strong>工作台状态详情</strong>
              <p>{sessionName} · {mode ? `当前使用 ${mode} 模式。` : '默认使用 Compose，可在底部输入框切换 Plan / Build。'}</p>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)}>关闭</button>
          </div>

          <div className="workbench-drawer-grid">
            <div className="workbench-drawer-card">
              <div className="mimo-intelligence-title">
                <span className="mimo-intelligence-dot dream" />
                Dream 记忆
              </div>
              <strong>{contextLoading ? '正在扫描…' : `${memory.length} 记忆 / ${checkpoints.length} 检查点`}</strong>
              <p>/dream 会扫描近期会话轨迹，把稳定的项目知识沉淀到长期记忆，并清理过期内容。</p>
              <FileList title="记忆文件" files={projectFiles.memory} empty="暂无记忆文件" />
              <FileList title="检查点" files={projectFiles.checkpoints} empty="暂无检查点" />
            </div>

            <div className="workbench-drawer-card">
              <div className="mimo-intelligence-title">
                <span className="mimo-intelligence-dot distill" />
                Distill 技能
              </div>
              <strong>{distillState}</strong>
              <p>/distill 会观察重复出现的手工工作流，将高置信候选沉淀为可复用的技能、子代理或命令。</p>
              <p className="workbench-drawer-note">后续可在这里展示 skill 候选、触发条件与沉淀状态。</p>
            </div>

            <div className="workbench-drawer-card compact">
              <strong>会话指标</strong>
              <div className="workbench-metric-row">
                <span>提示</span>
                <b>{userMessages}</b>
              </div>
              <div className="workbench-metric-row">
                <span>回复</span>
                <b>{assistantMessages}</b>
              </div>
              <div className="workbench-metric-row">
                <span>状态</span>
                <b>{statusLabel}</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function FileList({ title, files, empty }: { title: string; files: string[]; empty: string }) {
  return (
    <div className="workbench-file-list">
      <span>{title}</span>
      {files.length > 0 ? (
        <ul>
          {files.map(file => <li key={file}>{file}</li>)}
        </ul>
      ) : (
        <em>{empty}</em>
      )}
    </div>
  )
}

function getModeFromMessage(content?: string) {
  if (!content) return null
  const match = content.match(/^Mode:\s*(Compose|Plan|Build)\./i)
  if (!match) return null
  return match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()
}
