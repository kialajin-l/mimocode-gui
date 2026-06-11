import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'

export function useKeyboardShortcuts() {
  const createSession = useSessionStore((s) => s.createSession)
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            createSession('New Session', process.cwd())
            break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createSession])
}
