import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/api/distribution'
import type { LoginRequest, RegisterRequest, LoginResponse } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<LoginResponse['user'] | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const setAuth = (data: LoginResponse) => {
    token.value = data.access_token
    user.value = data.user
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const login = async (credentials: LoginRequest) => {
    loading.value = true
    try {
      const response = await api.login(credentials)
      setAuth(response)
      const redirect = router.currentRoute.value.query.redirect as string
      router.push(redirect || '/')
      return response
    } catch (e) {
      // 让上层处理错误提示
      throw e
    } finally {
      loading.value = false
    }
  }

  const register = async (credentials: RegisterRequest) => {
    loading.value = true
    try {
      await api.register(credentials)
      await login({ username: credentials.username, password: credentials.password })
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    clearAuth()
    router.push('/login')
  }

  const initAuth = async () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        user.value = JSON.parse(savedUser)
        // Validate token is still valid
        await api.getProfile()
      } catch {
        clearAuth()
      }
    }
  }

  return { token, user, loading, isAuthenticated, login, register, logout, initAuth }
})
