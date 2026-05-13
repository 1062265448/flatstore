<template>
  <div class="search-bar" ref="searchBarRef">
    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      class="search-input"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keyup.enter="doSearch"
    />
    <button v-if="modelValue" class="search-clear" @click.stop="clearAll">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <!-- 最近搜索下拉 -->
    <div v-if="showRecent && !modelValue && recentSearches.length" class="recent-dropdown">
      <div class="recent-header">
        <span class="recent-title">最近搜索</span>
        <button class="clear-btn" @click.stop="handleClearRecent">清除</button>
      </div>
      <div
        v-for="item in recentSearches"
        :key="item"
        class="recent-item"
        @click.stop="selectRecent(item)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>{{ item }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getRecentSearches, addSearch, clearSearches } from '@/utils/searchHistory'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'search': []
}>()

const searchBarRef = ref<HTMLElement | null>(null)
const showRecent = ref(false)
const recentSearches = ref<string[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  recentSearches.value = getRecentSearches()
})

const onInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    doSearch()
  }, 300)
}

const doSearch = () => {
  emit('search')
  if (props.modelValue.trim()) {
    addSearch(props.modelValue.trim())
  }
}

const clearAll = () => {
  emit('update:modelValue', '')
  emit('search')
}

const onFocus = () => {
  recentSearches.value = getRecentSearches()
  showRecent.value = true
}

const onBlur = () => {
  blurTimer = setTimeout(() => {
    showRecent.value = false
  }, 200)
}

const selectRecent = (item: string) => {
  emit('update:modelValue', item)
  addSearch(item)
  showRecent.value = false
  emit('search')
}

const handleClearRecent = () => {
  clearSearches()
  recentSearches.value = getRecentSearches()
}
</script>

<style scoped>
.search-bar {
  position: relative;
  padding: 0 var(--space-5) var(--space-3);
}
.search-icon {
  position: absolute;
  left: 36px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 40px 0 44px;
  font-size: 15px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  font-family: var(--font-body);
  transition: border-color var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.search-input::placeholder {
  color: var(--text-tertiary);
}
.search-clear {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  border-radius: 50%;
  border: none;
  background: transparent;
}
.search-clear:active {
  background: var(--surface-alt);
}

.recent-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: var(--space-5);
  right: var(--space-5);
  max-height: 240px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  z-index: 50;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px 6px;
  border-bottom: 1px solid var(--border);
}

.recent-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-btn {
  font-size: 11px;
  color: var(--accent);
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: background var(--duration-micro) var(--ease-out);

  &:active {
    background: var(--surface-alt);
  }
}
</style>
