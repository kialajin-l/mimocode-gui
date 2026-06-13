import { useState } from 'react'
import { useWritingStore, Character } from '../../stores/writingStore'

export function CharacterPanel() {
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useWritingStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Character>>({})
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    addCharacter(newName.trim(), newRole.trim() || '角色')
    setNewName('')
    setNewRole('')
  }

  const handleStartEdit = (character: Character) => {
    setEditingId(character.id)
    setEditData({
      name: character.name,
      description: character.description,
      role: character.role
    })
  }

  const handleSaveEdit = (id: string) => {
    if (editData.name?.trim()) {
      updateCharacter(id, editData)
    }
    // Always reset edit state to avoid stale UI
    setEditingId(null)
    setEditData({})
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors = ['#7c3aed', '#0ea5e9', '#22c55e', '#ef4444', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="writing-panel">
      <div className="writing-panel-header">
        <span className="writing-panel-title">角色管理</span>
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
            placeholder="角色名称..."
          />
          <input
            className="writing-input writing-input-sm"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="角色身份..."
          />
          <button className="writing-add-btn" onClick={handleAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="writing-empty">
            <p>暂无角色</p>
            <p className="writing-empty-hint">添加角色构建人物关系</p>
          </div>
        ) : (
          <div className="writing-list">
            {characters.map((character) => (
              <div key={character.id} className="writing-list-item writing-character-item">
                {editingId === character.id ? (
                  <div className="writing-character-edit">
                    <div className="writing-character-edit-row">
                      <label className="writing-label">名称</label>
                      <input
                        className="writing-inline-input"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        autoFocus
                      />
                    </div>
                    <div className="writing-character-edit-row">
                      <label className="writing-label">身份</label>
                      <input
                        className="writing-inline-input"
                        value={editData.role || ''}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                      />
                    </div>
                    <div className="writing-character-edit-row">
                      <label className="writing-label">描述</label>
                      <textarea
                        className="writing-textarea"
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={3}
                        placeholder="角色描述..."
                      />
                    </div>
                    <div className="writing-edit-actions">
                      <button className="writing-btn-secondary" onClick={handleCancelEdit}>
                        取消
                      </button>
                      <button className="writing-btn-primary" onClick={() => handleSaveEdit(character.id)}>
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="writing-list-item-header">
                      <div
                        className="writing-character-avatar"
                        style={{ backgroundColor: getAvatarColor(character.name) }}
                      >
                        {getInitials(character.name)}
                      </div>
                      <div className="writing-list-item-title">
                        <span className="writing-clickable-title" onClick={() => handleStartEdit(character)}>
                          {character.name}
                        </span>
                        <span className="writing-character-role">{character.role}</span>
                      </div>
                      <button
                        className="writing-delete-btn"
                        onClick={() => deleteCharacter(character.id)}
                        title="删除"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    {character.description && (
                      <div className="writing-character-desc">
                        {character.description}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
