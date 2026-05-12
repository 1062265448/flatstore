<template>
  <div class="stat-card" :class="{ highlight }" @click="$emit('click')">
    <div class="stat-val" :style="valueColor ? { color: valueColor } : {}">{{ value }}</div>
    <div class="stat-lbl">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  valueColor?: string
  highlight?: boolean
}>()
defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped>
.stat-card {
  flex: 1;
  padding: 16px var(--space-4);
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}
.stat-card:active {
  transform: scale(0.97);
}
.stat-card.highlight {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow-md);
}
.stat-card.highlight::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
}
.stat-val {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.8px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.stat-lbl {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  font-weight: 500;
}
</style>
