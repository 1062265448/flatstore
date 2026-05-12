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
  gap: var(--space-2);
  padding: 0 var(--space-5) var(--space-4);
  overflow-x: auto;
}
.filter-pill {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface);
  border: 1px solid var(--border);
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  box-shadow: var(--shadow-sm);
}
.filter-pill:active {
  transform: scale(0.95);
}
.filter-pill.active {
  background: var(--text);
  color: var(--text-inverse);
  border-color: var(--text);
  box-shadow: var(--shadow-md);
}
</style>
