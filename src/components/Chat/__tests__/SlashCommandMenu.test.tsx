import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SlashCommandMenu } from '../SlashCommandMenu'

function renderMenu(query: string, onSelect = vi.fn(), onClose = vi.fn()) {
  return render(<SlashCommandMenu query={query} onSelect={onSelect} onClose={onClose} />)
}

describe('SlashCommandMenu', () => {
  it('renders all commands when query is just "/"', () => {
    renderMenu('/')
    expect(screen.getByText('/dream')).toBeDefined()
    expect(screen.getByText('/distill')).toBeDefined()
    expect(screen.getByText('/plan')).toBeDefined()
    expect(screen.getByText('/build')).toBeDefined()
    expect(screen.getByText('/commit')).toBeDefined()
    expect(screen.getByText('/review')).toBeDefined()
    expect(screen.getByText('/test')).toBeDefined()
    expect(screen.getByText('/help')).toBeDefined()
    expect(screen.getByText('/clear')).toBeDefined()
  })

  it('filters commands by id match', () => {
    renderMenu('/plan')
    expect(screen.getByText('/plan')).toBeDefined()
    expect(screen.queryByText('/commit')).toBeNull()
    expect(screen.queryByText('/build')).toBeNull()
  })

  it('filters commands by description match', () => {
    renderMenu('/审查')
    expect(screen.getByText('/review')).toBeDefined()
    expect(screen.queryByText('/commit')).toBeNull()
  })

  it('calls onClose when no commands match', () => {
    const onClose = vi.fn()
    renderMenu('/nonexistent', vi.fn(), onClose)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSelect when clicking a command', () => {
    const onSelect = vi.fn()
    renderMenu('/', onSelect)
    fireEvent.click(screen.getByText('/commit').closest('.slash-command-item')!)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'commit', label: '/commit' })
    )
  })

  it('navigates with ArrowDown and selects with Enter', () => {
    const onSelect = vi.fn()
    renderMenu('/', onSelect)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'distill' })
    )
  })

  it('navigates with ArrowUp', () => {
    const onSelect = vi.fn()
    renderMenu('/', onSelect)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'Enter' })
    // ArrowUp wraps to last item = /clear
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'clear' })
    )
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    renderMenu('/', vi.fn(), onClose)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('selects on Tab', () => {
    const onSelect = vi.fn()
    renderMenu('/', onSelect)
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dream' })
    )
  })

  it('highlights item on mouse enter', () => {
    const { container } = renderMenu('/')
    const items = container.querySelectorAll('.slash-command-item')
    fireEvent.mouseEnter(items[2])
    expect(items[2].className).toContain('selected')
  })
})
