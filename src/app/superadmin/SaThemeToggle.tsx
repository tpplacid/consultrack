'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'sa-theme'
type Theme = 'light' | 'dark'

// Pulled out as a script-tag-ready function for inline injection in <head>.
// Runs BEFORE React hydrates so the page never flashes the wrong theme.
export function ThemeBootstrapScript() {
  const code = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'light';document.documentElement.setAttribute('data-sa-theme',t);}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export function SaThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'light'
    setTheme(stored)
    document.documentElement.setAttribute('data-sa-theme', stored)
  }, [])

  function flip() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-sa-theme', next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
  }

  return (
    <button
      onClick={flip}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all"
      style={{
        background: 'var(--sa-surface-strong)',
        border: '2px solid var(--sa-shadow-color)',
        color: 'var(--sa-text)',
        boxShadow: '2px 2px 0 0 var(--sa-shadow-color)',
        transform: 'translate(-1px,-1px)',
      }}
    >
      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  )
}
