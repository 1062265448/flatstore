<template>
  <div class="stat-card">
    <div class="stat-val" :style="valueColor ? { color: valueColor } : {}">{{ value }}</div>
    <div class="stat-lbl">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  valueColor?: string
}>()
</script>

<style scoped>
.stat-card {
  flex: 1;
  padding: 16px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}
.stat-val {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text);
}
.stat-lbl {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
</style>
