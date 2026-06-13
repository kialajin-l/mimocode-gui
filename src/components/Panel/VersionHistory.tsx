import { useState, useEffect } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useInspectorStore } from '../../stores/inspectorStore'

interface VersionHistoryProps {
  sessionId: string
}

type SubTab = 'local' | 'native'

export function VersionHistory({ sessionId }: VersionHistoryProps) {
  const session = useSessionStore(s => s.sessions.find(sess => sess.id === sessionId))
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [label, setLabel] = useState('')
  const [activeTab, setActiveTab] = useState<SubTab>('local')

  if (!session) return null
  const versions = session.versions || []

  const handleSaveVersion = () => {
    const store = useSessionStore.getState()
    const sessionData = store.sessions.find(s => s.id === sessionId)
    if (!sessionData) return

    const version = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      messages: [...(sessionData.messages || [])],
      label: label.trim() || `会话版本 ${(sessionData.versions || []).length + 1}`
    }

    store.updateSession(sessionId, {
      versions: [...(sessionData.versions || []), version]
    })

    setLabel('')
    setShowLabelInput(false)
  }

  const handleRestoreVersion = (versionId: string) => {
    const store = useSessionStore.getState()
    const sessionData = store.sessions.find(s => s.id === sessionId)
    if (!sessionData) return

    const version = (sessionData.versions || []).find(v => v.id === versionId)
    if (!version) return

    store.updateSession(sessionId, {
      messages: [...version.messages]
    })
  }

  return (
    <div className="version-history">
      <div className="version-sub-tabs">
        <button
          className={`version-sub-tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          本地版本
        </button>
        <button
          className={`version-sub-tab ${activeTab === 'native' ? 'active' : ''}`}
          onClick={() => setActiveTab('native')}
        >
          MiMo 会话
        </button>
      </div>

      {activeTab === 'local' ? (
        <LocalVersions
          versions={versions}
          showLabelInput={showLabelInput}
          setShowLabelInput={setShowLabelInput}
          label={label}
          setLabel={setLabel}
          onSave={handleSaveVersion}
          onRestore={handleRestoreVersion}
        />
      ) : (
        <NativeSessionList />
      )}
    </div>
  )
}

function LocalVersions({
  versions,
  showLabelInput,
  setShowLabelInput,
  label,
  setLabel,
  onSave,
  onRestore
}: {
  versions: any[]
  showLabelInput: boolean
  setShowLabelInput: (v: boolean) => void
  label: string
  setLabel: (v: string) => void
  onSave: () => void
  onRestore: (id: string) => void
}) {
  return (
    <>
      <div className="version-header">
        <h4>会话版本历史</h4>
        <button
          className="version-save-btn"
          onClick={() => setShowLabelInput(!showLabelInput)}
        >
          保存会话版本
        </button>
      </div>

      {showLabelInput && (
        <div className="version-label-input">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="会话版本标签（可选）"
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            autoFocus
          />
          <button onClick={onSave}>保存</button>
        </div>
      )}

      <div className="version-list">
        {versions.length === 0 ? (
          <div className="version-empty">暂无保存的会话版本</div>
        ) : (
          [...versions].reverse().map(version => (
            <div key={version.id} className="version-item">
              <div className="version-info">
                <div className="version-label">{version.label}</div>
                <div className="version-meta">
                  {version.timestamp.toLocaleString()} · {version.messages.length} 条消息
                </div>
              </div>
              <button
                className="version-restore-btn"
                onClick={() => onRestore(version.id)}
              >
                恢复
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function NativeSessionList() {
  const { sessions, sessionsLoading, fetchSessions, exportSessionDetail, currentSessionDetail, detailLoading, clearSessionDetail } = useInspectorStore()
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const handlePreview = async (sessionId: string) => {
    await exportSessionDetail(sessionId)
    setPreviewOpen(true)
  }

  const handleImport = (sessionEntry: any) => {
    const info = sessionEntry.info || sessionEntry
    const detail = currentSessionDetail || info

    const title = detail.title || info.name || info.id || '导入的会话'
    const directory = detail.directory || info.path || ''

    const nativeMessages = detail.messages || []
    const messages = nativeMessages.map((msg: any) => {
      const role = msg.role === 'human' ? 'user' : msg.role === 'ai' ? 'assistant' : msg.role
      const textParts = (msg.parts || [])
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.content || '')
        .join('\n')
      return {
        id: crypto.randomUUID(),
        role: role as 'user' | 'assistant' | 'system',
        content: textParts || msg.content || '',
        timestamp: new Date(msg.timestamp || Date.now())
      }
    })

    useSessionStore.getState().importSession({
      name: title,
      cwd: directory,
      messages,
      pid: null,
      status: 'idle',
      versions: [],
      projectId: null,
      changes: [],
      tags: []
    })

    clearSessionDetail()
    setPreviewOpen(false)
  }

  return (
    <div className="native-session-list">
      <div className="version-header">
        <h4>MiMo 原生会话</h4>
        <button
          className="version-save-btn"
          onClick={() => fetchSessions()}
          disabled={sessionsLoading}
        >
          {sessionsLoading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {sessionsLoading ? (
        <div className="version-empty">加载中...</div>
      ) : sessions.length === 0 ? (
        <div className="version-empty">暂无原生会话记录</div>
      ) : (
        <div className="version-list">
          {sessions.map((s: any) => (
            <div key={s.id} className="native-session-item">
              <div className="native-session-info">
                <div className="native-session-title">{s.name || s.id}</div>
                {s.path && <div className="native-session-dir">{s.path}</div>}
                {s.updatedAt && (
                  <div className="native-session-time">
                    {new Date(s.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="native-session-actions">
                <button
                  className="native-session-btn"
                  onClick={() => handlePreview(s.id)}
                >
                  预览
                </button>
                <button
                  className="native-session-btn import"
                  onClick={() => handleImport(s)}
                >
                  导入到 GUI
                </button>
                <button
                  className="native-session-btn disabled"
                  disabled
                  title="待接入 CLI 继续执行"
                >
                  继续此会话
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewOpen && (
        <div className="native-preview-overlay" onClick={() => { setPreviewOpen(false); clearSessionDetail() }}>
          <div className="native-preview-dialog" onClick={e => e.stopPropagation()}>
            <div className="native-preview-header">
              <h4>会话详情预览</h4>
              <button className="native-preview-close" onClick={() => { setPreviewOpen(false); clearSessionDetail() }}>×</button>
            </div>
            {detailLoading ? (
              <div className="version-empty">加载中...</div>
            ) : currentSessionDetail ? (
              <div className="native-preview-body">
                <div className="native-preview-field">
                  <span className="native-preview-label">标题</span>
                  <span>{currentSessionDetail.title || '-'}</span>
                </div>
                <div className="native-preview-field">
                  <span className="native-preview-label">目录</span>
                  <span className="native-preview-path">{currentSessionDetail.directory || '-'}</span>
                </div>
                <div className="native-preview-field">
                  <span className="native-preview-label">消息数</span>
                  <span>{(currentSessionDetail.messages || []).length}</span>
                </div>
                {currentSessionDetail.messages?.slice(0, 5).map((msg: any, i: number) => (
                  <div key={i} className="native-preview-msg">
                    <span className="native-preview-role">{msg.role}</span>
                    <span className="native-preview-text">
                      {((msg.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.content).join(' ')).slice(0, 120)}
                      {((msg.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.content).join(' ')).length > 120 ? '...' : ''}
                    </span>
                  </div>
                ))}
                {(currentSessionDetail.messages || []).length > 5 && (
                  <div className="native-preview-more">
                    ...还有 {(currentSessionDetail.messages || []).length - 5} 条消息
                  </div>
                )}
              </div>
            ) : (
              <div className="version-empty">无法加载会话详情</div>
            )}
            <div className="native-preview-footer">
              <button
                className="native-session-btn import"
                onClick={() => handleImport({ info: currentSessionDetail })}
              >
                导入到 GUI
              </button>
              <button
                className="native-session-btn"
                onClick={() => { setPreviewOpen(false); clearSessionDetail() }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
