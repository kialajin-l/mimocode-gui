import { McpServer } from '../../stores/mcpStore'

interface McpServerRowProps {
  server: McpServer
  onToggle: () => void
  onRemove: () => void
  onEdit: () => void
}

export function McpServerRow({ server, onToggle, onRemove, onEdit }: McpServerRowProps) {
  const readonly = server.readonly || server.source === 'claude'
  return (
    <div className={`mcp-server-row ${server.enabled ? 'enabled' : 'disabled'}`}>
      <div className="mcp-server-info">
        <div className="mcp-server-topline">
          <span className="mcp-server-name">{server.name}</span>
          <span className={`mcp-server-status ${server.enabled ? 'on' : 'off'}`}>
            {server.enabled ? '已启用' : '已停用'}
          </span>
          {readonly && <span className="mcp-server-status on">CLI 配置</span>}
        </div>
        <div className="mcp-server-command">
          <code>{server.command} {server.args.join(' ')}</code>
        </div>
        {server.env && Object.keys(server.env).length > 0 && (
          <div className="mcp-server-env">
            {Object.entries(server.env).map(([k]) => (
              <span key={k} className="mcp-env-chip">{k}</span>
            ))}
          </div>
        )}
      </div>
      <div className="mcp-server-actions">
        <button className="mcp-edit-btn" onClick={onEdit} title="编辑" disabled={readonly}>编辑</button>
        <label className="mcp-toggle">
          <input type="checkbox" checked={server.enabled} onChange={onToggle} disabled={readonly} />
          <span className="mcp-toggle-slider" />
        </label>
        <button className="mcp-remove-btn" onClick={onRemove} title="删除" disabled={readonly}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
