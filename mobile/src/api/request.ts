import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { Capacitor } from '@capacitor/core'

// API 基础地址
const PROD_API_URL = 'http://62.234.92.126/api'
const DEV_API_URL = import.meta.env.VITE_DEV_SERVER_URL || 'http://localhost:3002'

const BASE_URL = Capacitor.isNativePlatform()
  ? PROD_API_URL  // APK 直连服务器
  : (import.meta.env.VITE_API_BASE_URL || PROD_API_URL)

interface RequestInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
  get<R = any>(url: string, config?: AxiosRequestConfig): Promise<R>
  post<R = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  put<R = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  patch<R = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  delete<R = any>(url: string, config?: AxiosRequestConfig): Promise<R>
}

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
}) as RequestInstance

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const hasContentType =
      config.headers['Content-Type'] || config.headers['content-type']
    if (!hasContentType && !(config.data instanceof FormData) && !(config.data instanceof Blob)) {
      config.headers['Content-Type'] = 'application/json'
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 — 解包 response.data
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // 网络错误检测（无 response 且非超时）
    if (!error.response && !error.message.includes('timeout')) {
      if (!navigator.onLine) {
        error.response = error.response || {}
        error.response.data = { message: '网络连接已断开，请检查网络设置' }
      }
    }
    // 确保错误信息能被正确读取
    if (!error.response?.data?.message && error.message) {
      error.response = error.response || {}
      error.response.data = { message: error.message }
    }
    return Promise.reject(error)
  }
)

export default request
