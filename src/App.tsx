import { useEffect, useState, useCallback, useMemo } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'
import { SessionList } from './components/Sidebar/SessionList'
import { MessageList } from './components/Chat/MessageList'
import { MessageInput } from './components/Chat/MessageInput'
import { RightPanel } from './components/Panel/RightPanel'
import { SearchBar } from './components/Search/SearchBar'
import { ShortcutHelp } from './components/Help/ShortcutHelp'
import { WebUIHost } from './components/WebUI/WebUIHost'
import { useSession } from './hooks/useSession'
import { useKeyboardShortcuts, setTogglePanelCallback, setSearchOpenCallback } from './hooks/useKeyboardShortcuts'
import { useSessionStore } from './stores/sessionStore'
import { useRuntimeStore } from './stores/runtimeStore'
import { useI18n } from './i18n'
import { parseDiff } from './utils/diffParser'
import { exportSessionToMarkdown, sessionToFilename } from './utils/exportSession'
import { parseMarkdownToSession } from './utils/importSession'
import './App.css'

function App() {
  const { activeSession, sendMessage, cancelMessage, updateSession } = useSession()
  const loadData = useSessionStore(s => s.loadData)
  const sessions = useSessionStore(s => s.sessions)
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'chat' | 'webui'>('chat')
  const { t, locale, setLocale } = useI18n()
  const syncServeStatus = useRuntimeStore(s => s.syncServeStatus)
  useKeyboardShortcuts()

  const togglePanel = useCallback(() => {
    setPanelOpen(prev => !prev)
  }, [])

  useEffect(() => {
    setTogglePanelCallback(togglePanel)
    setSearchOpenCallback(() => setSearchOpen(true))
    return () => {
      setTogglePanelCallback(null)
      setSearchOpenCallback(null)
    }
  }, [togglePanel])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return sessions.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.messages.some(m => m.content.toLowerCase().includes(query))
    ).flatMap(s => {
      const matchingMessages = s.messages.filter(m =>
        m.content.toLowerCase().includes(query)
      )
      return [
        { type: 'session' as const, session: s },
        ...matchingMessages.map(m => ({ type: 'message' as const, session: s, message: m }))
      ]
    }).slice(0, 20)
  }, [searchQuery, sessions])

  const refreshChanges = useCallback(async () => {
    if (!activeSession) return
    const api = window.electronAPI
    if (!api) return
    try {
      const result = await api.gitDiff(activeSession.cwd || '.')
      if (result?.success && result.diff) {
        updateSession(activeSession.id, { changes: parseDiff(result.diff) })
      } else {
        updateSession(activeSession.id, { changes: [] })
      }
    } catch (e) {
      console.error('[App] refreshChanges error:', e)
    }
  }, [activeSession, updateSession])

  const handleAcceptChange = useCallback(async (file: string) => {
    const api = window.electronAPI
    if (!api || !activeSession) return
    await api.gitAccept(file, activeSession.cwd || '.')
    refreshChanges()
  }, [activeSession, refreshChanges])

  const handleRejectChange = useCallback(async (file: string) => {
    const api = window.electronAPI
    if (!api || !activeSession) return
    await api.gitReject(file, activeSession.cwd || '.')
    refreshChanges()
  }, [activeSession, refreshChanges])

  const handleExportSession = useCallback(async () => {
    const api = window.electronAPI
    if (!api || !activeSession) return
    const md = exportSessionToMarkdown(activeSession)
    const filename = sessionToFilename(activeSession)
    await api.saveFile(md, filename)
  }, [activeSession])

  const handleImportSession = useCallback(async () => {
    const api = window.electronAPI
    if (!api) return
    const result = await api.openFile()
    if (result?.success && result.content) {
      const sessionData = parseMarkdownToSession(result.content, result.filePath || 'imported')
      const importSession = useSessionStore.getState().importSession
      importSession(sessionData)
    }
  }, [])

  useEffect(() => {
    loadData()
    syncServeStatus()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('sessionId')
    if (sessionId) {
      const selectSession = useSessionStore.getState().setActiveSession
      selectSession(sessionId)
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="app">
        {searchOpen && (
          <SearchBar
            query={searchQuery}
            results={searchResults}
            onQueryChange={setSearchQuery}
            onClose={() => {
              setSearchOpen(false)
              setSearchQuery('')
            }}
          />
        )}
        {shortcutHelpOpen && (
          <ShortcutHelp onClose={() => setShortcutHelpOpen(false)} />
        )}
        <div className="title-bar">
          <div className="title-bar-left">
            <span>{t('menu.quickChat')}</span>
            <span>{t('menu.file')}</span>
            <span>{t('menu.edit')}</span>
            <span>{t('menu.view')}</span>
            <span
              className="menu-clickable"
              onClick={() => setShortcutHelpOpen(true)}
            >
              {t('menu.help')}
            </span>
          </div>
          <div className="title-bar-right">
            <button
              className="lang-toggle"
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              {locale === 'zh' ? 'EN' : '中'}
            </button>
            {t('app.title')}
          </div>
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
              <div className="sidebar-section-label">{t('sidebar.quickAccess')}</div>
              <button className="quick-item">
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                {t('sidebar.search')}
              </button>
              <button className="quick-item">
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>
                </span>
                {t('sidebar.plugins')}
              </button>
              <button className="quick-item">
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                {t('sidebar.automation')}
              </button>

              <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 }}>
                {t('sidebar.projects')}
              </div>

              <SessionList />
            </div>

            <div className="sidebar-bottom">
              <button className="settings-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                {t('sidebar.settings')}
              </button>
            </div>
          </aside>

          <main className="main-content">
            <header className="top-bar">
              <div className="top-bar-left">
                <button
                  className={`view-toggle-btn ${viewMode === 'chat' ? 'active' : ''}`}
                  onClick={() => setViewMode('chat')}
                  title="Chat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'webui' ? 'active' : ''}`}
                  onClick={() => setViewMode('webui')}
                  title="Web UI"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </button>
                <span className="session-breadcrumb">
                  {viewMode === 'webui' ? 'Web UI' : (activeSession?.name || t('app.title'))}
                </span>
              </div>
              <div className="top-bar-right">
                <button
                  className="top-btn import-btn"
                  onClick={handleImportSession}
                  title="导入会话"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </button>
                {activeSession && (
                  <button
                    className="top-btn export-btn"
                    onClick={handleExportSession}
                    title={t('export.exportSession')}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                )}
                <button
                  className={`top-btn ${panelOpen ? 'active' : ''}`}
                  onClick={() => setPanelOpen(!panelOpen)}
                  title={t('panel.review')}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                </button>
                <ThemeSwitcher />
              </div>
            </header>

            <div className="chat-area">
              {viewMode === 'webui' ? (
                <WebUIHost />
              ) : activeSession ? (
                <MessageList messages={activeSession.messages} sessionId={activeSession.id} />
              ) : (
                <div className="welcome">
                  <div className="welcome-illustration">
                    <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <h2>{t('welcome.title')}</h2>
                  <p>{t('welcome.subtitle')}</p>
                </div>
              )}
            </div>

            {viewMode === 'chat' && (
            <div className="input-bar">
              <div className="input-wrapper">
                <MessageInput
                  onSend={sendMessage}
                  onCancel={activeSession?.status === 'running' ? cancelMessage : undefined}
                  isRunning={activeSession?.status === 'running'}
                />
              </div>
            </div>
            )}
          </main>

          <RightPanel
            open={panelOpen}
            changes={activeSession?.changes || []}
            sessionId={activeSession?.id}
            onAcceptChange={handleAcceptChange}
            onRejectChange={handleRejectChange}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
