const HISTORY_KEY = 'flatstore_recent_searches'
const MAX_HISTORY = 10

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function addSearch(keyword: string): void {
  const trimmed = keyword.trim()
  if (!trimmed) return
  const list = getRecentSearches()
  const filtered = list.filter(s => s !== trimmed)
  filtered.unshift(trimmed)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)))
}

export function removeSearch(keyword: string): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getRecentSearches().filter(s => s !== keyword)))
}

export function clearSearches(): void {
  localStorage.removeItem(HISTORY_KEY)
}
