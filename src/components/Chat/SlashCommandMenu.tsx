import { useEffect, useState, useRef } from 'react'

export interface SlashCommand {
  id: string
  label: string
  description: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'new', label: '/new', description: '新建会话' },
  { id: 'file', label: '/file', description: '添加文件' },
  { id: 'plan', label: '/plan', description: '切换到 Plan 模式' },
  { id: 'build', label: '/build', description: '切换到 Build 模式' },
  { id: 'plugins', label: '/plugins', description: '打开插件管理' },
  { id: 'workflow', label: '/workflow', description: '打开自动化' },
  { id: 'status', label: '/status', description: '切换状态卡片' },
]

interface SlashCommandMenuProps {
  query: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
}

export function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filter = query.replace(/^\//, '').toLowerCase()
  const filtered = SLASH_COMMANDS.filter(cmd =>
    cmd.id.includes(filter) || cmd.description.includes(filter)
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (filtered.length === 0) {
      onClose()
    }
  }, [filtered.length, onClose])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex])
      }
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [filtered, selectedIndex, onSelect, onClose])

  if (filtered.length === 0) return null

  return (
    <div className="slash-command-menu" ref={menuRef}>
      {filtered.map((cmd, i) => (
        <div
          key={cmd.id}
          className={`slash-command-item ${i === selectedIndex ? 'selected' : ''}`}
          onMouseEnter={() => setSelectedIndex(i)}
          onClick={() => onSelect(cmd)}
        >
          <span className="slash-command-label">{cmd.label}</span>
          <span className="slash-command-desc">{cmd.description}</span>
        </div>
      ))}
    </div>
  )
}
