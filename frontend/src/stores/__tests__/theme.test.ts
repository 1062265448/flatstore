import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useThemeStore } from '../theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('应正确初始化状态', () => {
    const store = useThemeStore()
    expect(store.isDark).toBe(false)
  })

  describe('toggleTheme', () => {
    it('应切换主题状态', () => {
      const store = useThemeStore()

      expect(store.isDark).toBe(false)

      store.toggleTheme()
      expect(store.isDark).toBe(true)

      store.toggleTheme()
      expect(store.isDark).toBe(false)
    })

    it('应保存主题到 localStorage', () => {
      const store = useThemeStore()

      store.toggleTheme()
      expect(localStorage.getItem('theme')).toBe('dark')

      store.toggleTheme()
      expect(localStorage.getItem('theme')).toBe('light')
    })

    it('应正确切换 HTML 类名', () => {
      const store = useThemeStore()

      store.toggleTheme()
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      store.toggleTheme()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('initTheme', () => {
    it('应从 localStorage 恢复主题', () => {
      localStorage.setItem('theme', 'dark')
      const store = useThemeStore()

      store.initTheme()
      expect(store.isDark).toBe(true)
    })

    it('应处理空 localStorage', () => {
      localStorage.clear()
      const store = useThemeStore()

      store.initTheme()
      expect(store.isDark).toBe(false)
    })
  })
})
