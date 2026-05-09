import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

// API 基础地址
// Capacitor 原生环境：使用 ADB 反向代理（localhost:3002 → 电脑:3002）
// 浏览器开发环境：走 Vite 代理（/ 映射到 localhost:3002）
const isCapacitor = !!(window as any).Capacitor
const BASE_URL = isCapacitor
  ? 'http://localhost:3002'  // ADB reverse 代理
  : (import.meta.env.VITE_API_BASE_URL || '/')

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
    // 确保错误信息能被正确读取
    if (!error.response?.data?.message && error.message) {
      error.response = error.response || {}
      error.response.data = { message: error.message }
    }
    return Promise.reject(error)
  }
)

export default request
