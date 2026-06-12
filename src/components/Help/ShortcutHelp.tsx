interface ShortcutHelpProps {
  onClose: () => void
}

const shortcuts = [
  { keys: ['Ctrl', 'B'], description: '切换右侧面板' },
  { keys: ['Ctrl', 'K'], description: '打开搜索' },
  { keys: ['Ctrl', 'N'], description: '新建会话' },
  { keys: ['Ctrl', 'Enter'], description: '发送消息' },
  { keys: ['Shift', 'Enter'], description: '换行' },
  { keys: ['Escape'], description: '关闭弹窗/取消' },
  { keys: ['Ctrl', 'E'], description: '导出会话' },
  { keys: ['Ctrl', 'I'], description: '导入会话' },
]

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <div className="shortcut-overlay" onClick={onClose}>
      <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-header">
          <h3>快捷键</h3>
          <button className="shortcut-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="shortcut-list">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="shortcut-item">
              <div className="shortcut-keys">
                {shortcut.keys.map((key, j) => (
                  <span key={j}>
                    <kbd>{key}</kbd>
                    {j < shortcut.keys.length - 1 && <span className="shortcut-plus">+</span>}
                  </span>
                ))}
              </div>
              <span className="shortcut-desc">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
