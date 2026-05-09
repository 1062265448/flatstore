import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// ⚠️ 注意：Axios 拦截器已解包 response.data
// 响应拦截器会将 response.data 直接返回
// 所以 API 调用后 res.data 直接是数据数组/对象

// 自定义请求实例类型，拦截器已解包 response.data
interface RequestInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
}

const request: RequestInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  timeout: 30000,
}) as RequestInstance

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加 JWT Token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 如果没有指定 Content-Type 且数据不是 FormData/Blob，默认使用 JSON
    const hasContentType =
      config.headers['Content-Type'] || config.headers['content-type']
    if (!hasContentType && !(config.data instanceof FormData) && !(config.data instanceof Blob)) {
      config.headers['Content-Type'] = 'application/json'
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 — 已解包 response.data
request.interceptors.response.use(
  (response) => {
    // 返回 response.data 而不是整个 response
    return response.data
  },
  (error) => {
    // 401 未授权，跳转登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }

    const message = error.response?.data?.message || error.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default request
