<template>
  <div class="search-bar">
    <input
      class="search-input"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="$emit('search')"
    />
    <button v-if="modelValue" class="search-clear" @click="$emit('update:modelValue', ''); $emit('search')">✕</button>
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
  padding: 0 20px 12px;
}
.search-input {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 36px 0 16px;
  font-size: 15px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: var(--accent);
}
.search-input::placeholder {
  color: var(--text-tertiary);
}
.search-clear {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-10%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-tertiary);
  border-radius: 50%;
}
.search-clear:active {
  background: var(--border);
}
</style>
