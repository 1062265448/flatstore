<template>
  <div class="status-chip" :class="type">
    <span class="dot"></span>
    <span class="label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'green' | 'amber' | 'red' | 'gray'
  label: string
}>()
</script>

<style scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.green { color: var(--green); }
.green .dot { background: var(--green); }
.amber { color: var(--amber); }
.amber .dot { background: var(--amber); }
.red { color: var(--red); }
.red .dot { background: var(--red); }
.gray { color: var(--text-secondary); }
.gray .dot { background: var(--text-secondary); }
</style>
