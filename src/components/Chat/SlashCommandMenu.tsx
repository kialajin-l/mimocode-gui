import { useEffect, useState, useRef } from 'react'
import type { Skill } from '../../stores/skillStore'

export interface SlashCommand {
  id: string
  label: string
  description: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  // CLI 模式命令
  { id: 'dream', label: '/dream', description: '进入 Dream 模式（深度背景收集）' },
  { id: 'distill', label: '/distill', description: '从当前上下文提炼要点' },
  { id: 'plan', label: '/plan', description: '进入 Plan 模式（不直接改代码）' },
  { id: 'build', label: '/build', description: '进入 Build 模式（执行实现）' },
  // CLI 项目命令
  { id: 'commit', label: '/commit', description: '自动 commit 改动' },
  { id: 'review', label: '/review', description: '代码审查' },
  { id: 'test', label: '/test', description: '运行测试' },
  // 系统
  { id: 'help', label: '/help', description: '显示所有可用命令' },
  { id: 'clear', label: '/clear', description: '清空当前会话上下文' },
]

interface SlashCommandMenuProps {
  query: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  skills?: Skill[]
}

export function SlashCommandMenu({ query, onSelect, onClose, skills }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Build combined list: built-in commands + enabled skills
  const skillCommands: SlashCommand[] = (skills || [])
    .filter(s => s.enabled)
    .map(s => ({ id: `skill:${s.id}`, label: `/${s.id}`, description: s.description || s.name }))

  const allCommands = [...SLASH_COMMANDS, ...skillCommands]

  const filter = query.replace(/^\//, '').toLowerCase()
  const filtered = allCommands.filter(cmd =>
    cmd.id.toLowerCase().includes(filter) ||
    cmd.label.toLowerCase().includes(filter) ||
    cmd.description.toLowerCase().includes(filter)
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
