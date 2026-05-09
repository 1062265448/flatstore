<template>
  <div class="filter-row hide-scrollbar">
    <div
      v-for="pill in pills"
      :key="pill.value"
      class="filter-pill"
      :class="{ active: modelValue === pill.value }"
      @click="$emit('update:modelValue', pill.value)"
    >
      {{ pill.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  pills: { label: string; value: string }[]
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.filter-row {
  display: flex;
  gap: 6px;
  padding: 0 20px 16px;
  overflow-x: auto;
}
.filter-pill {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface);
  border: 1px solid var(--border);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}
.filter-pill:active {
  transform: scale(0.96);
}
.filter-pill.active {
  background: var(--text);
  color: white;
  border-color: var(--text);
}
</style>
