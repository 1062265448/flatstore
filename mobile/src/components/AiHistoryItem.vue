<template>
  <div class="ai-item" @click="$emit('click')">
    <div class="ai-thumb">
      <img v-if="item.imageUrl" :src="item.imageUrl" class="ai-thumb-img" />
      <span v-else>IMG</span>
    </div>
    <div class="ai-info">
      <div class="ai-batch">{{ item.batchNo || '识别失败' }}<template v-if="item.grade"> · {{ item.grade }}</template></div>
      <div class="ai-time">{{ formatTime(item.createdAt) }} · {{ item.itemCount }} 条记录</div>
    </div>
    <span class="ai-badge" :class="item.status === 'success' ? 'ai-ok' : 'ai-err'">
      {{ item.status === 'success' ? '成功' : '失败' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { AiRecognitionHistory } from '@/types'

defineProps<{ item: AiRecognitionHistory }>()
defineEmits<{ click: [] }>()

const formatTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.ai-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: opacity var(--duration-micro) var(--ease-out);
}
.ai-item:active {
  opacity: 0.7;
}
.ai-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.ai-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ai-info { flex: 1; min-width: 0; }
.ai-batch {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.ai-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.ai-ok { background: var(--green-soft); color: var(--green); }
.ai-err { background: var(--red-soft); color: var(--red); }
</style>
