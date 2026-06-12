import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'

let togglePanelCallback: (() => void) | null | undefined = undefined
let searchOpenCallback: (() => void) | null | undefined = undefined

export function setTogglePanelCallback(cb: (() => void) | null) {
  togglePanelCallback = cb
}

export function setSearchOpenCallback(cb: (() => void) | null) {
  searchOpenCallback = cb
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            useSessionStore.getState().createSession('New Session', '.')
            break
          case 'b':
            e.preventDefault()
            togglePanelCallback?.()
            break
          case 'k':
            e.preventDefault()
            searchOpenCallback?.()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
