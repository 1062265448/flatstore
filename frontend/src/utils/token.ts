/**
 * Token 与用户信息的 localStorage 存取 — 唯一出口
 * request.ts 与 stores/auth.ts 统一从这里读写，避免 key 散落各处
 */

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export interface SavedUser {
  id: number
  username: string
  role: string
  name?: string
  [key: string]: unknown
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getSavedUser(): SavedUser | null {
  const saved = localStorage.getItem(USER_KEY)
  if (!saved) return null
  try {
    return JSON.parse(saved) as SavedUser
  } catch {
    return null
  }
}

export function setSavedUser(user: SavedUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
