import { useEffect } from 'react'
import { usePluginStore, Plugin } from '../../stores/pluginStore'

interface PluginManagerProps {
  onClose: () => void
}

export function PluginManager({ onClose }: PluginManagerProps) {
  const { plugins, loadPlugins, togglePlugin, removePlugin } = usePluginStore()
  const enabledCount = plugins.filter(plugin => plugin.enabled).length

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-header">
        <div>
          <div className="plugin-manager-kicker">OpenCode 兼容扩展</div>
          <h3>插件</h3>
          <p>管理 MiMoCode 可用的插件能力，保持编程工作流可扩展但不偏离技术工作台。</p>
        </div>
        <div className="plugin-manager-actions">
          <div className="plugin-stat">
            <span>{plugins.length}</span>
            已安装
          </div>
          <div className="plugin-stat">
            <span>{enabledCount}</span>
            已启用
          </div>
          <button className="plugin-close-btn" onClick={onClose} title="返回工作台">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="plugin-library-summary">
        <div>
          <strong>插件库</strong>
          <span>适配 MiMo/OpenCode 插件生态，优先服务代码、工具、自动化与本地工作流。</span>
        </div>
        <span className="plugin-compat-badge">兼容 OpenCode</span>
      </div>

      <div className="plugin-list">
        {plugins.length === 0 ? (
          <div className="plugin-empty">
            <div className="plugin-empty-icon">⌘</div>
            <p>暂无已安装的插件</p>
            <p className="plugin-empty-hint">插件将在 mimo CLI 或 OpenCode 兼容目录中注册后自动显示。</p>
          </div>
        ) : (
          plugins.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggle={() => togglePlugin(plugin.id)}
              onRemove={() => removePlugin(plugin.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PluginCard({ plugin, onToggle, onRemove }: {
  plugin: Plugin
  onToggle: () => void
  onRemove: () => void
}) {
  const capability = getPluginCapability(plugin)

  return (
    <div className={`plugin-card ${plugin.enabled ? 'enabled' : ''}`}>
      <div className="plugin-card-info">
        <div className="plugin-card-topline">
          <div className="plugin-card-name">{plugin.name}</div>
          <span className={`plugin-status-chip ${plugin.enabled ? 'enabled' : ''}`}>
            {plugin.enabled ? '已启用' : '已停用'}
          </span>
        </div>
        <div className="plugin-card-desc">{plugin.description}</div>
        <div className="plugin-card-chips">
          <span>{capability}</span>
          <span>兼容 OpenCode</span>
          <span>本地</span>
        </div>
        <div className="plugin-card-path">{plugin.path}</div>
      </div>
      <div className="plugin-card-actions">
        <button className="plugin-config-btn" type="button">配置</button>
        <label className="plugin-toggle">
          <input
            type="checkbox"
            checked={plugin.enabled}
            onChange={onToggle}
          />
          <span className="plugin-toggle-slider" />
        </label>
        <button className="plugin-remove-btn" onClick={onRemove} title="移除插件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function getPluginCapability(plugin: Plugin) {
  const text = `${plugin.name} ${plugin.description} ${plugin.path}`.toLowerCase()
  if (text.includes('git') || text.includes('review') || text.includes('diff')) return '代码审查'
  if (text.includes('terminal') || text.includes('shell') || text.includes('run')) return '运行环境'
  if (text.includes('mcp') || text.includes('tool')) return '工具能力'
  if (text.includes('context') || text.includes('memory')) return '上下文'
  return '工作流'
}
