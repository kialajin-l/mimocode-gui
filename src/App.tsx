import { useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'
import { SessionList } from './components/Sidebar/SessionList'
import { MessageList } from './components/Chat/MessageList'
import { MessageInput } from './components/Chat/MessageInput'
import { RightPanel } from './components/Panel/RightPanel'
import { useSession } from './hooks/useSession'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSessionStore } from './stores/sessionStore'
import './App.css'

function App() {
  const { activeSession, sendMessage, cancelMessage } = useSession()
  const loadData = useSessionStore(s => s.loadData)
  const [panelOpen, setPanelOpen] = useState(false)
  useKeyboardShortcuts()

  useEffect(() => {
    loadData()
  }, [])

  return (
    <ErrorBoundary>
      <div className="app">
        <div className="title-bar">
          <div className="title-bar-left">
            <span>快速对话</span>
            <span>文件</span>
            <span>编辑</span>
            <span>视图</span>
            <span>帮助</span>
          </div>
          <div className="title-bar-right">Mimo Code</div>
        </div>

        <div className="app-body">
          <aside className="sidebar">
            <div className="sidebar-nav-row">
              <button className="nav-btn" title="返回">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button className="nav-btn" title="前进">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div className="sidebar-scroll">
              <div className="sidebar-section-label">快速对话</div>
              <button className="quick-item">
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                搜索
              </button>
              <button className="quick-item">
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>
                </span>
                插件
              </button>
              <button className="quick-item">
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                自动化
              </button>

              <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 }}>
                项目
              </div>

              <SessionList />
            </div>

            <div className="sidebar-bottom">
              <button className="settings-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                设置
              </button>
            </div>
          </aside>

          <main className="main-content">
            <header className="top-bar">
              <div className="top-bar-left">
                <span className="session-breadcrumb">
                  {activeSession?.name || 'MiMoCode'}
                </span>
              </div>
              <div className="top-bar-right">
                <button
                  className={`top-btn ${panelOpen ? 'active' : ''}`}
                  onClick={() => setPanelOpen(!panelOpen)}
                  title="切换面板"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                </button>
                <ThemeSwitcher />
              </div>
            </header>

            <div className="chat-area">
              {activeSession ? (
                <MessageList messages={activeSession.messages} />
              ) : (
                <div className="welcome">
                  <div className="welcome-illustration">
                    <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <h2>我们今天该做什么？</h2>
                  <p>描述你的任务，我会帮你规划、编码、审查并执行。</p>
                </div>
              )}
            </div>

            <div className="input-bar">
              <div className="input-wrapper">
                <MessageInput
                  onSend={sendMessage}
                  onCancel={activeSession?.status === 'running' ? cancelMessage : undefined}
                  isRunning={activeSession?.status === 'running'}
                />
              </div>
            </div>
          </main>

          <RightPanel
            open={panelOpen}
            onToggle={() => setPanelOpen(!panelOpen)}
            changes={activeSession?.changes || []}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
