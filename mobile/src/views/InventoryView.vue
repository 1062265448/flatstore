<template>
  <div class="inventory-view">
    <div class="page-header">
      <div class="header-label">平面库配货</div>
      <h1 class="header-title">库存</h1>
    </div>

    <SearchBar v-model="keyword" placeholder="搜索批号、品级、位置" @search="handleSearch" />

    <div class="stats">
      <StatCard :value="stats?.inventory.total || 0" label="总批次" />
      <StatCard :value="stats?.inventory.available || 0" label="可用" value-color="var(--green)" />
      <StatCard :value="stats?.inventory.reserved || 0" label="预留" value-color="var(--amber)" />
    </div>

    <FilterPills :pills="gradeFilters" v-model="selectedGrade" />

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
const page = reactive({ current: 1, size: 20 })

const gradeFilters = [
  { label: '全部', value: '' },
  { label: 'Ni9997', value: '9997' },
  { label: 'Ni9996', value: '9996' },
  { label: 'Ni9950', value: '9950' },
  { label: 'Ni9920', value: '9920' },
]

const hasMore = ref(false)

const fetchData = async (reset = false) => {
  if (reset) page.current = 1
  await inventoryStore.fetchInventory({
    page: page.current,
    limit: page.size,
    keyword: keyword.value || undefined,
    grade: selectedGrade.value || undefined,
  })
  hasMore.value = inventoryStore.inventoryList.length < inventoryStore.total
}

const handleSearch = () => fetchData(true)
const loadMore = () => {
  page.current++
  fetchData()
}

watch(selectedGrade, () => fetchData(true))

onMounted(async () => {
  await Promise.all([fetchData(), statisticsStore.fetchStatistics()])
  stats.value = statisticsStore.stats
})
</script>

<style scoped>
.inventory-view {
  padding-bottom: calc(var(--tab-height) + 20px);
  padding-top: var(--page-header-top);
}
.page-header {
  padding: 12px 20px 16px;
}
.header-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.header-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text);
}
.stats {
  display: flex;
  gap: 8px;
  padding: 0 20px 16px;
}
.list {
  padding: 0 20px;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.empty-hint {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  color: var(--text-tertiary);
}
.load-more {
  text-align: center;
  padding: 16px 0;
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
}
.load-more:active {
  opacity: 0.6;
}
.ai-fab {
  position: fixed;
  bottom: calc(var(--tab-height) + 16px);
  right: 20px;
  width: 52px;
  height: 52px;
  background: var(--text);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  z-index: 60;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ai-fab:active {
  transform: scale(0.9);
}
</style>
