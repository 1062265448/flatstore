<template>
  <div class="inventory-view">
    <div class="page-header">
      <div class="header-label">平面库配货</div>
      <h1 class="header-title">库存</h1>
    </div>

    <SearchBar v-model="keyword" placeholder="搜索批号、规格、位置" @search="handleSearch" />

    <!-- 统计卡片，可点击作为状态筛选 -->
    <div class="stats">
      <StatCard
        :value="stats?.inventory.total || 0"
        label="总批次"
        :highlight="selectedStatus === ''"
        @click="selectStatus('')"
      />
      <StatCard
        :value="stats?.inventory.available || 0"
        label="可用"
        :highlight="selectedStatus === 'available'"
        value-color="var(--green)"
        @click="selectStatus('available')"
      />
      <StatCard
        :value="stats?.inventory.reserved || 0"
        label="预留"
        :highlight="selectedStatus === 'reserved'"
        value-color="var(--amber)"
        @click="selectStatus('reserved')"
      />
    </div>

    <!-- 汇总 -->
    <div class="summary-bar">
      <span class="summary-item">重量总计 <strong>{{ pageTotalWeight }}t</strong></span>
      <span class="summary-item">片数总计 <strong>{{ pageTotalPieces }}块</strong></span>
    </div>

    <FilterPills :pills="gradeFilters" v-model="selectedGrade" />

    <div class="filter-row-label">类型</div>
    <FilterPills :pills="productTypeFilters" v-model="selectedProductType" />

    <div class="filter-row-label">规格</div>
    <FilterPills :pills="specFilters" v-model="selectedSpec" />

    <div class="filter-row-label">日期</div>
    <div class="date-row">
      <input v-model="selectedDate" type="date" class="date-input-single" title="创建日期" />
    </div>

    <div class="list">
      <div v-if="inventoryStore.loading" class="loading-state">
        <div class="spinner spinner-lg"></div>
      </div>
      <template v-else>
        <InventoryTable
          :items="inventoryStore.inventoryList"
          @click="router.push(`/inventory/${$event.id}`)"
        />
      </template>

      <!-- 翻页 -->
      <div v-if="totalPages > 1 && !inventoryStore.loading" class="pagination">
        <button class="page-btn" :disabled="page.current <= 1" @click="goPage(page.current - 1)">上一页</button>
        <span class="page-indicator">{{ page.current }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page.current >= totalPages" @click="goPage(page.current + 1)">下一页</button>
      </div>
    </div>

    <!-- AI FAB -->
    <button class="ai-fab" @click="router.push('/ai')">AI</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useStatisticsStore } from '@/stores/statistics'
import SearchBar from '@/components/SearchBar.vue'
import StatCard from '@/components/StatCard.vue'
import FilterPills from '@/components/FilterPills.vue'
import InventoryTable from '@/components/InventoryTable.vue'

const router = useRouter()
const inventoryStore = useInventoryStore()
const statisticsStore = useStatisticsStore()
const stats = ref(statisticsStore.stats)

const keyword = ref('')
const selectedGrade = ref('')
const selectedProductType = ref('')
const selectedSpec = ref('')
const selectedStatus = ref('')
const selectedDate = ref('')
const page = reactive({ current: 1, size: 20 })

const gradeFilters = [
  { label: '全部', value: '' },
  { label: 'Ni9997', value: '9997' },
  { label: 'Ni9996', value: '9996' },
  { label: 'Ni9950', value: '9950' },
  { label: 'Ni9920', value: '9920' },
]

const productTypeFilters = [
  { label: '全部', value: '' },
  { label: '电解镍', value: '电解镍' },
  { label: '电积镍', value: '电积镍' },
  { label: '不锈钢', value: '不锈钢专用镍' },
  { label: '电镀镍', value: '电镀专用镍' },
]

const specFilters = [
  { label: '全部', value: '' },
  { label: '整板', value: '整板' },
  { label: '镍条', value: '镍条' },
  { label: '100*100', value: '100*100' },
  { label: '50*50', value: '50*50' },
  { label: '25*25', value: '25*25' },
]

const hasMore = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(inventoryStore.total / page.size)))

const pageTotalWeight = computed(() =>
  inventoryStore.inventoryList.reduce((s, i) => s + Number(i.weight), 0).toFixed(3)
)
const pageTotalPieces = computed(() =>
  inventoryStore.inventoryList.reduce((s, i) => s + (i.pieceCount || 0), 0)
)

const fetchData = async (reset = false) => {
  if (reset) page.current = 1
  await inventoryStore.fetchInventory({
    page: page.current,
    limit: page.size,
    keyword: keyword.value || undefined,
    grade: selectedGrade.value || undefined,
    productType: selectedProductType.value || undefined,
    specification: selectedSpec.value || undefined,
    status: selectedStatus.value || undefined,
    dateFrom: selectedDate.value || undefined,
  })
  hasMore.value = inventoryStore.inventoryList.length < inventoryStore.total
}

const handleSearch = () => fetchData(true)
const goPage = (p: number) => {
  page.current = p
  fetchData()
}

// Watch all filter pills and date for changes
watch([selectedGrade, selectedProductType, selectedSpec, selectedStatus, selectedDate], () => fetchData(true))

// 点击统计卡片切换状态筛选
const selectStatus = (status: string) => {
  selectedStatus.value = status
}

onMounted(async () => {
  await Promise.all([fetchData(), statisticsStore.fetchStatistics()])
  stats.value = statisticsStore.stats
})
</script>

<style scoped>
.inventory-view {
  padding-bottom: calc(var(--tab-height) + var(--space-5));
}
.page-header {
  padding: var(--page-header-top) var(--space-5) var(--space-4);
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
}
.header-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.header-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: var(--text);
  font-family: var(--font-display);
}
.stats {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-5) var(--space-4);
}

.filter-row-label {
  padding: var(--space-3) var(--space-5) var(--space-1);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.3px;
}

.date-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-5) var(--space-2);
}
.date-input-single {
  flex: 1;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-4);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  font-family: var(--font-body);
  transition: border-color var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
}
.date-input-single:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.list {
  padding: 0 var(--space-5);
}

.summary-bar {
  display: flex;
  gap: var(--space-5);
  padding: var(--space-2) var(--space-5);
}
.summary-item {
  font-size: 12px;
  color: var(--text-tertiary);
}
.summary-item strong {
  color: var(--accent);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}
.page-btn {
  height: 36px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface);
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
}
.page-btn:active:not(:disabled) { background: var(--surface-alt); }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-indicator {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.ai-fab {
  position: fixed;
  bottom: calc(var(--tab-height) + var(--space-4));
  right: var(--space-5);
  width: 56px;
  height: 56px;
  background: var(--text);
  color: white;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  box-shadow: var(--shadow-fab);
  z-index: 60;
  transition: all var(--duration-slow) var(--ease-out-expo);
}
.ai-fab:active {
  transform: scale(0.9);
}
</style>
