import request from './request'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: {
    id: number
    username: string
    role: string
  }
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface UserProfile {
  id: number
  username: string
  role: string
  createdAt: string
}

// 登录
export const login = (data: LoginRequest) => {
  return request.post<LoginResponse>('/auth/login', data)
}

// 注册
export const register = (data: RegisterRequest) => {
  return request.post<{ id: number; username: string; role: string }>('/auth/register', data)
}

// 获取用户信息
export const getProfile = () => {
  return request.get<UserProfile>('/auth/profile')
}
