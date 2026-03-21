'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'
type DisplayMode = 'simple' | 'professional'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [displayMode, setDisplayModeState] = useState<DisplayMode>('simple')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const savedMode = localStorage.getItem('displayMode') as DisplayMode | null
    if (savedTheme) setThemeState(savedTheme)
    if (savedMode) setDisplayModeState(savedMode)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    const updateTheme = () => {
      let resolved: 'light' | 'dark' = 'light'

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      } else {
        resolved = theme
      }

      setResolvedTheme(resolved)
      root.setAttribute('data-theme', resolved)
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }

    updateTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateTheme)

    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-display-mode', displayMode)
  }, [displayMode, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const setDisplayMode = (newMode: DisplayMode) => {
    setDisplayModeState(newMode)
    localStorage.setItem('displayMode', newMode)
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, resolvedTheme, displayMode, setDisplayMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

const defaultThemeValue: ThemeContextValue = {
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
  displayMode: 'simple',
  setDisplayMode: () => {},
}

export function useTheme() {
  const context = useContext(ThemeContext)
  // Durante SSG/prerender puede no haber contexto; devolver defaults
  return context ?? defaultThemeValue
}
