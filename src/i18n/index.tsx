import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import en from './en.json'
import zh from './zh.json'

type Locale = 'en' | 'zh'

const translations: Record<Locale, Record<string, any>> = { en, zh }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`
  })
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('mimocode-locale')
    if (saved === 'en' || saved === 'zh') return saved
    return navigator.language.startsWith('zh') ? 'zh' : 'en'
  })

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem('mimocode-locale', newLocale)
    setLocaleState(newLocale)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[locale], key)
    if (value === undefined) {
      console.warn(`[i18n] Missing translation: ${key}`)
      return key
    }
    if (params) {
      return interpolate(value, params)
    }
    return value
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
