import { useThemeStore } from '../stores/themeStore'

export function useTheme() {
  const { theme, setTheme } = useThemeStore()
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }
  
  return { theme, setTheme, toggleTheme }
}
