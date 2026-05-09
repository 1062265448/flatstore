<template>
  <div class="inventory-card" @click="$emit('click')">
    <div class="card-head">
      <span class="card-batch">{{ item.batchNo }}</span>
      <span class="card-tag" :class="gradeTagClass">{{ item.grade }}</span>
    </div>
    <div class="card-grid">
      <div class="card-field">
        <div class="field-lbl">包号</div>
        <div class="field-val mono">{{ item.packageNo || '-' }}</div>
      </div>
      <div class="card-field">
        <div class="field-lbl">重量</div>
        <div class="field-val mono">{{ formatWeight(item.weight) }}</div>
      </div>
      <div class="card-field">
        <div class="field-lbl">块数</div>
        <div class="field-val">{{ item.pieceCount }}</div>
      </div>
      <div class="card-field">
        <div class="field-lbl">位置</div>
        <div class="field-val">{{ item.location || '-' }}</div>
      </div>
    </div>
    <div class="card-foot">
      <StatusChip :type="statusType" :label="statusLabel" />
      <div class="card-actions">
        <button class="btn-sm ghost" @click.stop="$emit('detail', item)">详情</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { InventoryStock } from '@/types'
import StatusChip from './StatusChip.vue'

const props = defineProps<{
  item: InventoryStock
}>()

defineEmits<{
  click: []
  detail: [item: InventoryStock]
}>()

const gradeTagClass = computed(() => {
  const g = props.item.grade
  if (g.includes('9997') || g.includes('9996')) return 'tag-9996'
  if (g.includes('9950') || g.includes('9990')) return 'tag-9950'
  return 'tag-other'
})

const statusType = computed(() => {
  const map: Record<string, 'green' | 'amber' | 'gray'> = {
    available: 'green',
    reserved: 'amber',
    shipped: 'gray',
  }
  return map[props.item.status] || 'gray'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    available: '可用',
    reserved: '预留',
    shipped: '已发货',
  }
  return map[props.item.status] || props.item.status
})

const formatWeight = (w: string | number) => {
  const n = Number(w)
  if (isNaN(n)) return '-'
  return n >= 1000 ? n.toLocaleString() : n.toFixed(2)
}
</script>

<style scoped>
.inventory-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 18px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.inventory-card:active {
  transform: scale(0.985);
  border-color: var(--border-strong);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.card-batch {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text);
}
.card-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.3px;
}
.tag-9996 { background: var(--accent-soft); color: var(--accent); }
.tag-9950 { background: var(--amber-soft); color: var(--amber); }
.tag-other { background: var(--green-soft); color: var(--green); }

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.card-field .field-lbl {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  font-weight: 500;
  margin-bottom: 3px;
}
.card-field .field-val {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.card-field .field-val.mono {
  font-family: var(--font-mono);
  font-size: 13px;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.card-actions {
  display: flex;
  gap: 6px;
}
.btn-sm {
  padding: 5px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-sm:active {
  transform: scale(0.95);
}
.btn-sm.ghost {
  background: transparent;
  color: var(--text-secondary);
}
</style>
