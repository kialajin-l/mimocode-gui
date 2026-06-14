import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'
import { SessionList } from './components/Sidebar/SessionList'
import { MessageList } from './components/Chat/MessageList'
import { MessageInput } from './components/Chat/MessageInput'
import { WorkbenchOverview } from './components/Chat/WorkbenchOverview'
import { RightPanel } from './components/Panel/RightPanel'
import { SearchBar } from './components/Search/SearchBar'
import { ShortcutHelp } from './components/Help/ShortcutHelp'
import { PluginManager } from './components/Settings/PluginManager'
import { WorkflowPanel } from './components/Panel/WorkflowPanel'
import { SettingsPage } from './components/Settings/SettingsPage'
import { useSettingsStore } from './stores/settingsStore'
import { SideStatusCard } from './components/Status/SideStatusCard'
import { useSession } from './hooks/useSession'
import { useKeyboardShortcuts, setTogglePanelCallback, setSearchOpenCallback } from './hooks/useKeyboardShortcuts'
import { useSessionStore } from './stores/sessionStore'
import { useI18n } from './i18n'
import { useThemeStore } from './stores/themeStore'
import { parseDiff } from './utils/diffParser'
import { exportSessionToMarkdown, sessionToFilename } from './utils/exportSession'
import { parseMarkdownToSession } from './utils/importSession'
import { ConfirmDialog, ConfirmDialogProps } from './components/Security/ConfirmDialog'
import './App.css'

function App() {
  const { activeSession, sendMessage, cancelMessage, updateSession } = useSession()
  const loadData = useSessionStore(s => s.loadData)
  const sessions = useSessionStore(s => s.sessions)
  const projects = useSessionStore(s => s.projects)
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  type WorkspaceView = 'workbench' | 'plugins' | 'settings' | 'automation'
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('workbench')
  const navHistoryRef = useRef<string[]>([])
  const navIndexRef = useRef<number>(-1)
  const navSkipRef = useRef(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  const navigateTo = useCallback((view: WorkspaceView) => {
    if (navSkipRef.current) {
      navSkipRef.current = false
      return
    }
    const history = navHistoryRef.current.slice(0, navIndexRef.current + 1)
    history.push(view)
    navHistoryRef.current = history
    navIndexRef.current = history.length - 1
    setWorkspaceView(view)
    setCanGoBack(navIndexRef.current > 0)
    setCanGoForward(false)
  }, [])

  const goBack = useCallback(() => {
    if (navIndexRef.current > 0) {
      navIndexRef.current -= 1
      navSkipRef.current = true
      setWorkspaceView(navHistoryRef.current[navIndexRef.current] as WorkspaceView)
      setCanGoBack(navIndexRef.current > 0)
      setCanGoForward(navIndexRef.current < navHistoryRef.current.length - 1)
    }
  }, [])

  const goForward = useCallback(() => {
    if (navIndexRef.current < navHistoryRef.current.length - 1) {
      navIndexRef.current += 1
      navSkipRef.current = true
      setWorkspaceView(navHistoryRef.current[navIndexRef.current] as WorkspaceView)
      setCanGoBack(navIndexRef.current > 0)
      setCanGoForward(navIndexRef.current < navHistoryRef.current.length - 1)
    }
  }, [])
  const [confirmDialog, setConfirmDialog] = useState<Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'> & { onConfirm: () => void } | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const { t, locale, setLocale } = useI18n()
  const toggleTheme = useThemeStore(s => s.toggleTheme)
  const showStatusCard = useSettingsStore(s => s.showStatusCard)
  useKeyboardShortcuts()

  useEffect(() => {
    if (!openMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  const activeProject = activeSession?.projectId
    ? projects.find(project => project.id === activeSession.projectId)
    : undefined

  const handleWindowMinimize = useCallback(() => {
    window.electronAPI?.windowMinimize?.()
  }, [])

  const handleWindowToggleMaximize = useCallback(() => {
    window.electronAPI?.windowToggleMaximize?.()
  }, [])

  const handleWindowClose = useCallback(() => {
    window.electronAPI?.windowClose?.()
  }, [])

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
    const cwd = activeSession.cwd || '.'
    let diffSummary = `文件：${file}\n操作：git checkout HEAD -- ${file}`
    try {
      const diffResult = await api.gitFileDiff(file, cwd)
      if (diffResult?.success && diffResult.diff) {
        const lines = diffResult.diff.split('\n').slice(0, 20)
        diffSummary += `\n\nDiff 预览：\n${lines.join('\n')}${diffResult.diff.split('\n').length > 20 ? '\n...' : ''}`
      }
    } catch { /* ignore */ }
    setConfirmDialog({
      open: true,
      title: '还原文件更改',
      message: `这会丢弃 "${file}" 的所有更改并恢复到上一版本，此操作不可撤销。`,
      details: diffSummary,
      confirmLabel: '还原',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null)
        await api.gitReject(file, cwd)
        refreshChanges()
      }
    })
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

  const handleQuickChat = useCallback(() => {
    navigateTo('workbench')
    setOpenMenu(null)
    setTimeout(() => {
      const textarea = document.querySelector('.input-bar textarea') as HTMLTextAreaElement
      textarea?.focus()
    }, 50)
  }, [])

  useEffect(() => {
    loadData()
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
        {confirmDialog && (
          <ConfirmDialog
            {...confirmDialog}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
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
          <div className="title-bar-left" ref={menuBarRef}>
            <span className="title-brand">MiMoCode</span>
            <span
              className={`menu-clickable ${openMenu === 'quickChat' ? 'active' : ''}`}
              onClick={handleQuickChat}
            >
              {t('menu.quickChat')}
            </span>
            <span
              className={`menu-clickable ${openMenu === 'file' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            >
              {t('menu.file')}
              {openMenu === 'file' && (
                <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
                  <button
                    className="menu-dropdown-item"
                    disabled={!activeSession}
                    onClick={() => { handleExportSession(); setOpenMenu(null) }}
                  >
                    {t('menu.exportSession')}
                  </button>
                  <button
                    className="menu-dropdown-item"
                    onClick={() => { handleImportSession(); setOpenMenu(null) }}
                  >
                    {t('menu.importSession')}
                  </button>
                  <div className="menu-dropdown-separator" />
                  <button
                    className="menu-dropdown-item"
                    onClick={() => { handleWindowClose(); setOpenMenu(null) }}
                  >
                    {t('menu.exit')}
                  </button>
                </div>
              )}
            </span>
            <span
              className={`menu-clickable ${openMenu === 'edit' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            >
              {t('menu.edit')}
              {openMenu === 'edit' && (
                <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
                  <div className="menu-dropdown-disabled" title="后续接入">{t('menu.undo')}</div>
                  <div className="menu-dropdown-disabled" title="后续接入">{t('menu.redo')}</div>
                  <div className="menu-dropdown-separator" />
                  <button
                    className="menu-dropdown-item"
                    onClick={() => { setSearchOpen(true); setOpenMenu(null) }}
                  >
                    {t('menu.find')}
                  </button>
                </div>
              )}
            </span>
            <span
              className={`menu-clickable ${openMenu === 'view' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            >
              {t('menu.view')}
              {openMenu === 'view' && (
                <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
                  <button
                    className="menu-dropdown-item"
                    onClick={() => { setPanelOpen(p => !p); setOpenMenu(null) }}
                  >
                    {t('menu.togglePanel')}
                  </button>
                  <button
                    className="menu-dropdown-item"
                    onClick={() => { toggleTheme(); setOpenMenu(null) }}
                  >
                    {t('menu.themeToggle')}
                  </button>
                  <div className="menu-dropdown-separator" />
                  <button
                    className="menu-dropdown-item"
                    onClick={() => { navigateTo('plugins'); setOpenMenu(null) }}
                  >
                    {t('menu.pluginManager')}
                  </button>
                </div>
              )}
            </span>
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
            <span>{t('app.title')}</span>
            <div className="window-controls">
              <button type="button" onClick={handleWindowMinimize} aria-label="最小化">
                <svg viewBox="0 0 12 12"><path d="M2 6.5h8" /></svg>
              </button>
              <button type="button" onClick={handleWindowToggleMaximize} aria-label="最大化">
                <svg viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1" /></svg>
              </button>
              <button type="button" className="close" onClick={handleWindowClose} aria-label="关闭">
                <svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="app-body">
          <aside className="sidebar">
            <div className="sidebar-nav-row">
              <button className="nav-btn" title="返回" onClick={goBack} disabled={!canGoBack}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button className="nav-btn" title="前进" onClick={goForward} disabled={!canGoForward}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div className="sidebar-scroll">
              <div className="sidebar-section-label">{t('sidebar.quickAccess')}</div>
              <button className="quick-item" onClick={() => setSearchOpen(true)}>
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                {t('sidebar.search')}
              </button>
              <button
                className={`quick-item ${workspaceView === 'plugins' ? 'active' : ''}`}
                onClick={() => navigateTo('plugins')}
              >
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>
                </span>
                {t('sidebar.plugins')}
              </button>
              <button
                className={`quick-item ${workspaceView === 'automation' ? 'active' : ''}`}
                onClick={() => navigateTo(workspaceView === 'automation' ? 'workbench' : 'automation')}
              >
                <span className="quick-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                {t('sidebar.automation')}
              </button>

              <SessionList />
            </div>

            <div className="sidebar-bottom">
              <button
                className={`settings-item ${workspaceView === 'settings' ? 'active' : ''}`}
                onClick={() => navigateTo(workspaceView === 'settings' ? 'workbench' : 'settings')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                {t('sidebar.settings')}
              </button>
            </div>
          </aside>

          <main className="main-content">
            <header className="top-bar">
              <div className="top-bar-left">
                <button
                  className={`view-toggle-btn ${workspaceView === 'workbench' ? 'active' : ''}`}
                  onClick={() => navigateTo('workbench')}
                  title="工作台"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <span className="session-breadcrumb">
                  {workspaceView === 'plugins' ? '插件' : workspaceView === 'settings' ? '设置' : workspaceView === 'automation' ? '自动化' : (activeSession?.name || t('app.title'))}
                </span>
                {workspaceView === 'workbench' && activeSession && (
                  <WorkbenchOverview
                    sessionName={activeSession.name}
                    status={activeSession.status}
                    messages={activeSession.messages}
                    cwd={activeSession.cwd}
                  />
                )}
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

            <div className={`chat-area ${workspaceView === 'plugins' || workspaceView === 'settings' || workspaceView === 'automation' ? 'workspace-page-area' : ''}`}>
              {workspaceView === 'plugins' ? (
                <PluginManager onClose={() => navigateTo('workbench')} />
              ) : workspaceView === 'settings' ? (
                <SettingsPage onClose={() => navigateTo('workbench')} />
              ) : workspaceView === 'automation' ? (
                <WorkflowPanel onSendMessage={sendMessage} />
              ) : activeSession ? (
                <MessageList
                  messages={activeSession.messages}
                  sessionId={activeSession.id}
                  isRunning={activeSession.status === 'running'}
                />
              ) : (
                <div className="welcome workbench-welcome">
                  <div className="welcome-illustration">
                    <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <span className="welcome-kicker">原生 MiMo 工作台</span>
                  <h2>{t('welcome.title')}</h2>
                  <p>{t('welcome.subtitle')}</p>
                  <div className="welcome-mode-row">
                    <span>Compose：组织想法</span>
                    <span>Plan：规划变更</span>
                    <span>Build：安全构建</span>
                  </div>
                  <p className="welcome-footnote">直接在底部输入任务即可开始；没有会话时会自动创建。</p>
                </div>
              )}
            </div>

            {workspaceView === 'workbench' && (
            <div className="input-bar">
              <div className="input-wrapper">
                <MessageInput
                  onSend={sendMessage}
                  onCancel={activeSession?.status === 'running' ? cancelMessage : undefined}
                  isRunning={activeSession?.status === 'running'}
                  onNewSession={() => {
                    const createSession = useSessionStore.getState().createSession
                    const session = createSession('New Session', '.')
                    useSessionStore.getState().setActiveSession(session.id)
                  }}
                  onOpenPlugins={() => navigateTo('plugins')}
                  onOpenWorkflow={() => navigateTo('automation')}
                  onToggleStatus={() => useSettingsStore.getState().setShowStatusCard(!useSettingsStore.getState().showStatusCard)}
                />
              </div>
            </div>
            )}
            {showStatusCard && <SideStatusCard session={activeSession} project={activeProject} />}
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
