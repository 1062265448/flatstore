<template>
  <div class="search-bar">
    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      class="search-input"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="$emit('search')"
    />
    <button v-if="modelValue" class="search-clear" @click="$emit('update:modelValue', ''); $emit('search')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'search': []
}>()
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
</style>
