import { usePluginStore, Plugin } from '../../stores/pluginStore'

interface PluginManagerProps {
  onClose: () => void
}

export function PluginManager({ onClose }: PluginManagerProps) {
  const { plugins, togglePlugin, removePlugin } = usePluginStore()

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-header">
        <h3>插件管理</h3>
        <button className="plugin-close-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="plugin-list">
        {plugins.length === 0 ? (
          <div className="plugin-empty">
            <p>暂无已安装的插件</p>
            <p className="plugin-empty-hint">插件将在 mimo CLI 中注册后自动显示</p>
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
  return (
    <div className={`plugin-card ${plugin.enabled ? 'enabled' : ''}`}>
      <div className="plugin-card-info">
        <div className="plugin-card-name">{plugin.name}</div>
        <div className="plugin-card-desc">{plugin.description}</div>
        <div className="plugin-card-path">{plugin.path}</div>
      </div>
      <div className="plugin-card-actions">
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
