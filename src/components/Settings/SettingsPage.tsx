import { useEffect, useState } from 'react'
import { useThemeStore } from '../../stores/themeStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useMcpStore, McpServer } from '../../stores/mcpStore'
import { useModelStore } from '../../stores/modelStore'
import { McpServerRow } from './McpServerRow'
import { McpForm } from './McpForm'
import { ProviderFormModal } from './ProviderFormModal'
import { useI18n } from '../../i18n'

type SettingsTab = 'interface' | 'models' | 'mcp'

interface SettingsPageProps {
  onClose: () => void
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('interface')

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <div className="settings-kicker">Configuration</div>
          <h3>设置</h3>
          <p>管理 MiMoCode 的外观、模型和工具。</p>
        </div>
        <button className="settings-close-btn" onClick={onClose} title="返回工作台">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab-btn ${activeTab === 'interface' ? 'active' : ''}`}
          onClick={() => setActiveTab('interface')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          界面
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          模型
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'mcp' ? 'active' : ''}`}
          onClick={() => setActiveTab('mcp')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
          MCP
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'interface' && <InterfaceTab />}
        {activeTab === 'models' && <ModelsTab />}
        {activeTab === 'mcp' && <McpTab />}
      </div>
    </div>
  )
}

function InterfaceTab() {
  const { theme, setTheme } = useThemeStore()
  const { locale, setLocale } = useI18n()
  const { showStatusCard, setShowStatusCard } = useSettingsStore()

  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <h4>外观</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-label">主题</span>
            <span className="settings-desc">切换深色或浅色模式</span>
          </div>
          <div className="settings-toggle-group">
            <button className={`settings-toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>深色</button>
            <button className={`settings-toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>浅色</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>语言</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-label">界面语言</span>
            <span className="settings-desc">切换 MiMoCode 界面显示语言</span>
          </div>
          <div className="settings-toggle-group">
            <button className={`settings-toggle-btn ${locale === 'zh' ? 'active' : ''}`} onClick={() => setLocale('zh')}>中文</button>
            <button className={`settings-toggle-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => setLocale('en')}>English</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>界面</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-label">状态卡片</span>
            <span className="settings-desc">在侧边显示会话和项目状态卡片</span>
          </div>
          <label className="settings-switch">
            <input type="checkbox" checked={showStatusCard} onChange={e => setShowStatusCard(e.target.checked)} />
            <span className="settings-switch-slider" />
          </label>
        </div>
      </section>
    </div>
  )
}

function ModelsTab() {
  const {
    providers, customProviders,
    loadProviders, addCustomProvider, removeCustomProvider,
    fetchProviderModelsResult,
  } = useModelStore()
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [providerFetchStatus, setProviderFetchStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const handleImport = async () => {
    setImporting(true)
    try {
      const api = window.electronAPI
      if (!api?.openFile) return

      const result = await api.openFile([
        { name: 'Config Files', extensions: ['json', 'yaml', 'yml', 'toml'] },
        { name: 'All Files', extensions: ['*'] }
      ])

      if (result?.success && result.content) {
        try {
          const config = JSON.parse(result.content)

          // Try to detect hermes-studio config format
          if (config.custom_providers) {
            for (const cp of config.custom_providers) {
              const id = await addCustomProvider({
                name: cp.name,
                baseUrl: cp.base_url,
                defaultModel: cp.model,
                models: cp.models ? Object.keys(cp.models) : [],
              })
              if (id && cp.api_key) {
                await api.apiKeySave(id, cp.api_key)
              }
            }
          }

          // Try to detect opencode config format
          if (config.providers) {
            for (const [key, provider] of Object.entries(config.providers as Record<string, any>)) {
              if (provider.base_url || provider.baseUrl) {
                const id = await addCustomProvider({
                  name: key,
                  baseUrl: provider.base_url || provider.baseUrl,
                  defaultModel: provider.model || provider.default_model,
                  models: provider.models || [],
                })
                const importedKey = provider.api_key || provider.apiKey
                if (id && importedKey) {
                  await api.apiKeySave(id, importedKey)
                }
              }
            }
          }

          // Generic format: array of providers
          if (Array.isArray(config)) {
            for (const item of config) {
              if (item.name && item.baseUrl) {
                const id = await addCustomProvider({
                  name: item.name,
                  baseUrl: item.baseUrl,
                  defaultModel: item.defaultModel,
                  models: item.models || [],
                })
                if (id && item.apiKey) {
                  await api.apiKeySave(id, item.apiKey)
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse config:', err)
        }
      }
    } catch (err) {
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  const cliProviders = providers.filter(p => p.isCli)
  const configuredProviders = providers.filter(p => p.isCustom && !p.isCli)

  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <div className="section-header-row">
          <h4>已连接的 Provider</h4>
          <div className="section-actions">
            <button className="settings-import-btn" onClick={handleImport} disabled={importing}>
              {importing ? '导入中...' : '导入配置'}
            </button>
            <button className="settings-add-btn" onClick={() => { setEditingProvider(null); setShowProviderForm(true) }}>
              + 添加 Provider
            </button>
          </div>
        </div>

        {cliProviders.length > 0 && (
          <div className="provider-list">
            {cliProviders.map(provider => (
              <div key={provider.id} className="provider-card">
                <div className="provider-card-header">
                  <div>
                    <span className="provider-name">{provider.label}</span>
                    <span className="provider-badge">MiMo CLI</span>
                    {provider.source && <span className="provider-badge custom">{formatProviderSource(provider.source)}</span>}
                  </div>
                  {provider.customProviderId && (
                    <div className="provider-card-actions">
                      <button className="provider-edit-btn" onClick={() => {
                        const cp = customProviders.find(c => c.id === provider.customProviderId)
                        if (cp) { setEditingProvider(cp); setShowProviderForm(true) }
                      }}>编辑</button>
                      <button className="provider-fetch-btn" onClick={async () => {
                        if (!provider.customProviderId) return
                        setProviderFetchStatus(prev => ({ ...prev, [provider.id]: '获取中...' }))
                        const result = await fetchProviderModelsResult(provider.baseUrl, provider.customProviderId)
                        const fetched = result.models
                        if (fetched.length > 0) {
                          await useModelStore.getState().updateCustomProvider(provider.customProviderId, { models: fetched })
                          setProviderFetchStatus(prev => ({ ...prev, [provider.id]: `已更新 ${fetched.length} 个模型` }))
                        } else {
                          setProviderFetchStatus(prev => ({ ...prev, [provider.id]: result.error || '未获取到模型' }))
                        }
                      }} title="刷新模型列表">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      </button>
                    </div>
                  )}
                </div>
                {provider.baseUrl && <div className="provider-base-url">{provider.baseUrl}</div>}
                {providerFetchStatus[provider.id] && (
                  <div className={providerFetchStatus[provider.id].startsWith('已更新') ? 'form-success' : 'form-error'}>
                    {providerFetchStatus[provider.id]}
                  </div>
                )}
                <div className="provider-models">
                  {provider.models.slice(0, 8).map(m => <span key={m} className="model-tag">{formatProviderModel(m)}</span>)}
                  {provider.models.length > 8 && (
                    <span className="model-tag more">+{provider.models.length - 8} 更多</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {configuredProviders.length === 0 && cliProviders.length === 0 ? (
          <div className="mcp-empty">
            <p>暂无已配置的 Provider</p>
            <p className="mcp-empty-hint">点击"添加 Provider"或"导入配置"开始。</p>
          </div>
        ) : configuredProviders.length > 0 ? (
          <div className="provider-list">
            {configuredProviders.map(provider => (
              <div key={provider.id} className="provider-card custom">
                <div className="provider-card-header">
                  <div>
                    <span className="provider-name">{provider.label}</span>
                    <span className="provider-badge custom">自定义</span>
                  </div>
                  <div className="provider-card-actions">
                    <button className="provider-edit-btn" onClick={() => {
                      const cp = customProviders.find(c => `custom:${c.id}` === provider.id)
                      if (cp) { setEditingProvider(cp); setShowProviderForm(true) }
                    }}>编辑</button>
                    <button className="provider-remove-btn" onClick={() => {
                      const cp = customProviders.find(c => `custom:${c.id}` === provider.id)
                      if (cp) removeCustomProvider(cp.id)
                    }}>删除</button>
                    <button className="provider-fetch-btn" onClick={async () => {
                      setProviderFetchStatus(prev => ({ ...prev, [provider.id]: '获取中...' }))
                      const result = await fetchProviderModelsResult(provider.baseUrl, provider.customProviderId)
                      const fetched = result.models
                      if (fetched.length > 0) {
                        // Find the custom provider and update its models
                        const cp = customProviders.find(c => `custom:${c.id}` === provider.id)
                        if (cp) {
                          await useModelStore.getState().updateCustomProvider(cp.id, { models: fetched })
                        }
                        setProviderFetchStatus(prev => ({ ...prev, [provider.id]: `已更新 ${fetched.length} 个模型` }))
                      } else {
                        setProviderFetchStatus(prev => ({ ...prev, [provider.id]: result.error || '未获取到模型' }))
                      }
                    }} title="刷新模型列表">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                  </div>
                </div>
                <div className="provider-base-url">{provider.baseUrl}</div>
                {providerFetchStatus[provider.id] && (
                  <div className={providerFetchStatus[provider.id].startsWith('已更新') ? 'form-success' : 'form-error'}>
                    {providerFetchStatus[provider.id]}
                  </div>
                )}
                <div className="provider-models">
                  {provider.models.length > 0 ? (
                    provider.models.map(m => <span key={m} className="model-tag">{m}</span>)
                  ) : (
                    <span className="provider-no-models">暂无模型，点击右侧按钮获取</span>
                  )}
                  {provider.models.length > 8 && (
                    <span className="model-tag more">+{provider.models.length - 8} 更多</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {showProviderForm && (
        <ProviderFormModal
          initial={editingProvider}
          onClose={() => { setShowProviderForm(false); setEditingProvider(null) }}
        />
      )}
    </div>
  )
}

function McpTab() {
  const { servers, loaded, loadServers, addServer, updateServer, removeServer, toggleServer } = useMcpStore()
  const [showMcpForm, setShowMcpForm] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)

  useEffect(() => {
    loadServers()
  }, [loadServers])

  const handleAddMcp = async (data: { name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean }) => {
    await addServer(data)
    setShowMcpForm(false)
  }

  const handleEditMcp = async (data: { name: string; command: string; args: string[]; env?: Record<string, string>; enabled: boolean }) => {
    if (editingServer) {
      await updateServer(editingServer.id, data)
      setEditingServer(null)
    }
  }

  return (
    <div className="settings-tab-content">
      <section className="settings-section">
        <h4>MCP 服务</h4>
        <p className="settings-section-desc">管理 Model Context Protocol 服务器，为 AI 提供工具和数据连接。</p>
        <div className="mcp-toolbar">
          <button className="mcp-add-btn" onClick={() => { setEditingServer(null); setShowMcpForm(true) }}>
            + 添加 MCP 服务
          </button>
        </div>
        {showMcpForm && !editingServer && (
          <McpForm onSubmit={handleAddMcp} onCancel={() => setShowMcpForm(false)} />
        )}
        {editingServer && (
          <McpForm initial={editingServer} onSubmit={handleEditMcp} onCancel={() => setEditingServer(null)} />
        )}
        <div className="mcp-server-list">
          {!loaded ? (
            <div className="mcp-empty">加载中...</div>
          ) : servers.length === 0 ? (
            <div className="mcp-empty">
              <p>暂无 MCP 服务配置</p>
              <p className="mcp-empty-hint">点击"添加 MCP 服务"配置工具服务器。</p>
            </div>
          ) : (
            servers.map(server => (
              <McpServerRow
                key={server.id}
                server={server}
                onToggle={() => toggleServer(server.id)}
                onRemove={() => removeServer(server.id)}
                onEdit={() => setEditingServer(server)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function formatProviderModel(model: string) {
  return model.replace(/^[^/]+\//, '')
}

function formatProviderSource(source: string) {
  if (source === 'Credentials') return '已登录'
  if (source === 'Environment') return '环境变量'
  if (source === 'Native') return '内置'
  return source
}
