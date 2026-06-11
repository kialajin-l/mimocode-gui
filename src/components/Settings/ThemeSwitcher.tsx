import { useTheme } from '../../hooks/useTheme'

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button onClick={toggleTheme} className="theme-switcher">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
