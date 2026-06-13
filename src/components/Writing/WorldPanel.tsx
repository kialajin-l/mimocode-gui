import { useState, useMemo } from 'react'
import { useWritingStore, WorldSetting } from '../../stores/writingStore'

export function WorldPanel() {
  const { worldSettings, addWorldSetting, updateWorldSetting, deleteWorldSetting } = useWritingStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<WorldSetting>>({})
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('设定')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const handleAdd = () => {
    if (!newName.trim()) return
    addWorldSetting(newName.trim(), newCategory.trim() || '设定')
    setNewName('')
    if (!expandedCategories.has(newCategory.trim() || '设定')) {
      setExpandedCategories(prev => new Set([...prev, newCategory.trim() || '设定']))
    }
  }

  const handleStartEdit = (setting: WorldSetting) => {
    setEditingId(setting.id)
    setEditData({
      name: setting.name,
      description: setting.description,
      category: setting.category
    })
  }

  const handleSaveEdit = (id: string) => {
    if (editData.name?.trim()) {
      updateWorldSetting(id, editData)
    }
    // Always reset edit state to avoid stale UI
    setEditingId(null)
    setEditData({})
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const groupedSettings = useMemo(() => worldSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, WorldSetting[]>), [worldSettings])

  const categories = useMemo(() => Object.keys(groupedSettings).sort(), [groupedSettings])

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase()
    if (lower.includes('地理') || lower.includes('地')) return '🌍'
    if (lower.includes('历史') || lower.includes('历')) return '📜'
    if (lower.includes('文化') || lower.includes('文')) return '🎭'
    if (lower.includes('魔法') || lower.includes('power')) return '✨'
    if (lower.includes('科技') || lower.includes('tech')) return '⚙️'
    if (lower.includes('种族') || lower.includes('race')) return '👥'
    return '📋'
  }

  return (
    <div className="writing-panel">
      <div className="writing-panel-header">
        <span className="writing-panel-title">世界观设定</span>
      </div>

      <div className="writing-panel-content">
        <div className="writing-add-row">
          <input
            className="writing-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="设定名称..."
          />
          <input
            className="writing-input writing-input-sm"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="分类..."
          />
          <button className="writing-add-btn" onClick={handleAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="writing-empty">
            <p>暂无设定</p>
            <p className="writing-empty-hint">添加世界观设定丰富故事背景</p>
          </div>
        ) : (
          <div className="writing-list">
            {categories.map((category) => (
              <div key={category} className="writing-category-group">
                <div
                  className="writing-category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="writing-category-icon">{getCategoryIcon(category)}</span>
                  <span className="writing-category-name">{category}</span>
                  <span className="writing-category-count">{groupedSettings[category].length}</span>
                  <svg
                    className={`writing-category-chevron ${expandedCategories.has(category) ? 'expanded' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {expandedCategories.has(category) && (
                  <div className="writing-category-items">
                    {groupedSettings[category].map((setting) => (
                      <div key={setting.id} className="writing-list-item writing-setting-item">
                        {editingId === setting.id ? (
                          <div className="writing-setting-edit">
                            <div className="writing-setting-edit-row">
                              <label className="writing-label">名称</label>
                              <input
                                className="writing-inline-input"
                                value={editData.name || ''}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                autoFocus
                              />
                            </div>
                            <div className="writing-setting-edit-row">
                              <label className="writing-label">分类</label>
                              <input
                                className="writing-inline-input"
                                value={editData.category || ''}
                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                              />
                            </div>
                            <div className="writing-setting-edit-row">
                              <label className="writing-label">描述</label>
                              <textarea
                                className="writing-textarea"
                                value={editData.description || ''}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                rows={3}
                                placeholder="设定描述..."
                              />
                            </div>
                            <div className="writing-edit-actions">
                              <button className="writing-btn-secondary" onClick={handleCancelEdit}>
                                取消
                              </button>
                              <button className="writing-btn-primary" onClick={() => handleSaveEdit(setting.id)}>
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="writing-list-item-header">
                            <div className="writing-list-item-title">
                              <span className="writing-clickable-title" onClick={() => handleStartEdit(setting)}>
                                {setting.name}
                              </span>
                              {setting.description && (
                                <span className="writing-setting-desc-preview">
                                  {setting.description.length > 30
                                    ? setting.description.slice(0, 30) + '...'
                                    : setting.description}
                                </span>
                              )}
                            </div>
                            <button
                              className="writing-delete-btn"
                              onClick={() => deleteWorldSetting(setting.id)}
                              title="删除"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
