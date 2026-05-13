<template>
  <div class="inv-list">
    <div
      v-for="(item, idx) in items"
      :key="item.id"
      class="inv-item"
      @click="$emit('click', item)"
    >
      <div class="inv-primary">
        <span class="inv-idx">{{ idx + 1 }}</span>
        <span class="inv-batch">{{ item.batchNo }}</span>
        <span class="inv-pkg">包号{{ item.packageNo || '-' }}</span>
        <span class="inv-grade" :class="gradeClass(item.grade)">{{ item.grade }}</span>
        <span class="inv-weight">{{ formatWeight(item.weight) }}t</span>
        <span class="inv-pieces">{{ item.pieceCount }}块</span>
      </div>
      <div class="inv-secondary">
        <span class="inv-meta">
          <template v-if="item.productType">{{ item.productType }}</template>
          <template v-if="item.productType && item.specification"> · </template>
          <template v-if="item.specification">{{ item.specification }}</template>
          <template v-if="(item.productType || item.specification) && item.location"> · </template>
          <template v-if="item.location">{{ item.location }}</template>
          <template v-if="!item.productType && !item.specification && !item.location">-</template>
        </span>
        <span class="inv-status" :class="'st-' + item.status">{{ statusText(item.status) }}</span>
      </div>
    </div>
    <div v-if="!items.length" class="inv-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
        <path d="M20 7L12 3L4 7V17L12 21L20 17V7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M4 7L12 11L20 7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M12 11V21" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <div class="empty-text">暂无库存数据</div>
      <div class="empty-hint">添加筛选条件或前往 AI 识别添加</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InventoryStock } from '@/types'

defineProps<{ items: InventoryStock[] }>()
defineEmits<{ click: [item: InventoryStock] }>()

const gradeClass = (grade: string) => {
  if (grade.includes('9997') || grade.includes('9996')) return 'g-high'
  if (grade.includes('9950')) return 'g-mid'
  return 'g-other'
}

const statusText = (status: string) => {
  const map: Record<string, string> = { available: '可用', reserved: '预留', shipped: '已发' }
  return map[status] || status
}

const formatWeight = (w: string | number) => {
  const n = Number(w)
  if (isNaN(n)) return '-'
  return n.toFixed(3)
}
</script>

<style scoped>
.inv-list {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.inv-item {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--duration-micro) var(--ease-out);
}
.inv-item:last-child { border-bottom: none; }
.inv-item:active { background: var(--surface-alt); }

/* 主信息行 */
.inv-primary {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.inv-idx {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  min-width: 18px;
  flex-shrink: 0;
}
.inv-batch {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-pkg {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.inv-grade {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  letter-spacing: 0.3px;
}
.g-high { background: var(--accent-soft); color: var(--accent); }
.g-mid { background: var(--amber-soft); color: var(--amber); }
.g-other { background: var(--green-soft); color: var(--green); }

.inv-weight {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.inv-pieces {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* 补充信息行 */
.inv-secondary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-1);
}
.inv-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  margin-left: var(--space-2);
}
.st-available { background: var(--green-soft); color: var(--green); }
.st-reserved { background: var(--amber-soft); color: var(--amber); }
.st-shipped { background: var(--surface-alt); color: var(--text-tertiary); }

.inv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--text-tertiary);
}
.inv-empty .empty-text {
  font-size: 14px;
  font-weight: 500;
}
.inv-empty .empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  opacity: 0.8;
}

</style>
