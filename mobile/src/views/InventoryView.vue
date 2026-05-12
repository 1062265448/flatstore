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
        <InventoryCard
          v-for="item in inventoryStore.inventoryList"
          :key="item.id"
          :item="item"
          @click="router.push(`/inventory/${item.id}`)"
          @detail="router.push(`/inventory/${item.id}`)"
        />
        <div v-if="!inventoryStore.inventoryList.length" class="empty-hint">暂无库存数据</div>
        <div v-if="hasMore" class="load-more" @click="loadMore">加载更多</div>
      </template>
    </div>

    <!-- AI FAB -->
    <button class="ai-fab" @click="router.push('/ai')">AI</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useStatisticsStore } from '@/stores/statistics'
import SearchBar from '@/components/SearchBar.vue'
import StatCard from '@/components/StatCard.vue'
import FilterPills from '@/components/FilterPills.vue'
import InventoryCard from '@/components/InventoryCard.vue'

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
const loadMore = () => {
  page.current++
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
  padding-top: var(--page-header-top);
}
.page-header {
  padding: var(--space-3) var(--space-5) var(--space-4);
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
.load-more {
  text-align: center;
  padding: var(--space-4) 0;
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
  font-weight: 500;
}
.load-more:active {
  opacity: 0.6;
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
