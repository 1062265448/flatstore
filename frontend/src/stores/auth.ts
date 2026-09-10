import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, getProfile as apiGetProfile, type LoginRequest, type RegisterRequest, type LoginResponse, type UserProfile } from '@/api/auth'
import router from '@/router'
import { getToken, setToken, getSavedUser, setSavedUser, clearAuth as clearStoredAuth } from '@/utils/token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<LoginResponse['user'] | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const setAuth = (data: LoginResponse) => {
    token.value = data.access_token
    user.value = data.user
    setToken(data.access_token)
    setSavedUser(data.user)
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    clearStoredAuth()
  }

  const login = async (credentials: LoginRequest) => {
    try {
      loading.value = true
      const response = await apiLogin(credentials) as LoginResponse
      setAuth(response)
      router.push('/')
      return response
    } finally {
      loading.value = false
    }
  }

  const register = async (credentials: RegisterRequest) => {
    try {
      loading.value = true
      const response = await apiRegister(credentials)
      // 注册成功后自动登录
      await login(credentials)
      return response
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    clearAuth()
    router.push('/login')
  }

  const fetchProfile = async () => {
    if (!token.value) return null
    try {
      const profile = await apiGetProfile() as UserProfile
      user.value = { ...user.value, ...profile }
      return profile
    } catch (error) {
      // Token 可能过期，清除认证状态
      clearAuth()
      throw error
    }
  }

  // 初始化时从 localStorage 恢复用户信息
  const initAuth = () => {
    const savedUser = getSavedUser()
    if (savedUser) {
      user.value = savedUser
    } else if (localStorage.getItem('user')) {
      // user 存在但 JSON 损坏，清除认证状态
      clearAuth()
    }
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    fetchProfile,
    initAuth,
  }
})