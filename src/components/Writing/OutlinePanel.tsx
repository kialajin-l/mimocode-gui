import { useState } from 'react'
import { useWritingStore, Chapter } from '../../stores/writingStore'

export function OutlinePanel() {
  const { chapters, addChapter, updateChapter, deleteChapter, reorderChapters } = useWritingStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order)

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addChapter(newTitle.trim())
    setNewTitle('')
  }

  const handleStartEdit = (chapter: Chapter) => {
    setEditingId(chapter.id)
    setEditTitle(chapter.title)
  }

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateChapter(id, { title: editTitle.trim() })
    } else {
      // Revert to original title on empty
      const chapter = chapters.find(c => c.id === id)
      if (chapter) setEditTitle(chapter.title)
    }
    setEditingId(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const reordered = [...sortedChapters]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(index - 1, 0, moved)
    reorderChapters(reordered.map((ch, i) => ({ ...ch, order: i })))
  }

  const handleMoveDown = (index: number) => {
    if (index >= sortedChapters.length - 1) return
    const reordered = [...sortedChapters]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(index + 1, 0, moved)
    reorderChapters(reordered.map((ch, i) => ({ ...ch, order: i })))
  }

  const getStatusColor = (status: Chapter['status']) => {
    switch (status) {
      case 'draft': return 'var(--text-tertiary)'
      case 'review': return 'var(--accent-color)'
      case 'final': return 'var(--success-color)'
    }
  }

  const getStatusLabel = (status: Chapter['status']) => {
    switch (status) {
      case 'draft': return '草稿'
      case 'review': return '审核中'
      case 'final': return '定稿'
    }
  }

  const getWordCount = (content: string) => {
    if (!content.trim()) return 0
    // CJK-aware: count characters for CJK, words for others
    const cjkChars = (content.match(/[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]/gu) || []).length
    const otherWords = content.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]/gu, '').trim().split(/\s+/).filter(Boolean).length
    return cjkChars + otherWords
  }

  return (
    <div className="writing-panel">
      <div className="writing-panel-header">
        <span className="writing-panel-title">章节大纲</span>
      </div>

      <div className="writing-panel-content">
        <div className="writing-add-row">
          <input
            className="writing-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="输入章节标题..."
          />
          <button className="writing-add-btn" onClick={handleAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {sortedChapters.length === 0 ? (
          <div className="writing-empty">
            <p>暂无章节</p>
            <p className="writing-empty-hint">添加第一个章节开始写作</p>
          </div>
        ) : (
          <div className="writing-list">
            {sortedChapters.map((chapter, index) => (
              <div key={chapter.id} className="writing-list-item">
                <div className="writing-list-item-header">
                  <div className="writing-list-item-order">
                    <button
                      className="writing-reorder-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="上移"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                    <span className="writing-order-number">{chapter.order + 1}</span>
                    <button
                      className="writing-reorder-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedChapters.length - 1}
                      title="下移"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>

                  <div className="writing-list-item-title">
                    {editingId === chapter.id ? (
                      <input
                        className="writing-inline-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(chapter.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => handleSaveEdit(chapter.id)}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="writing-clickable-title"
                        onClick={() => handleStartEdit(chapter)}
                      >
                        {chapter.title}
                      </span>
                    )}
                  </div>

                  <button
                    className="writing-delete-btn"
                    onClick={() => deleteChapter(chapter.id)}
                    title="删除"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div className="writing-list-item-meta">
                  <select
                    className="writing-status-select"
                    value={chapter.status}
                    onChange={(e) => updateChapter(chapter.id, { status: e.target.value as Chapter['status'] })}
                  >
                    <option value="draft">草稿</option>
                    <option value="review">审核中</option>
                    <option value="final">定稿</option>
                  </select>
                  <span className="writing-status-badge" style={{ color: getStatusColor(chapter.status) }}>
                    {getStatusLabel(chapter.status)}
                  </span>
                  <span className="writing-word-count">
                    {getWordCount(chapter.content)} 字
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
