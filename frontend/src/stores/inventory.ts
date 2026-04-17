import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { InventoryStock, CreateInventoryDto, UpdateInventoryDto, InventoryQuery } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref<InventoryStock[]>([])
  const total = ref(0)
  const loading = ref(false)

  const fetchInventory = async (params: InventoryQuery = {}) => {
    loading.value = true
    try {
      // ⚠️ Axios 已解包，res.data 直接是数组
      const res = await api.getInventoryList(params)
      inventoryList.value = res.data
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  const createInventory = async (dto: CreateInventoryDto) => {
    const res = await api.createInventory(dto)
    await fetchInventory()
    return res
  }

  const updateInventory = async (id: number, dto: UpdateInventoryDto) => {
    const res = await api.updateInventory(id, dto)
    await fetchInventory()
    return res
  }

  const deleteInventory = async (id: number) => {
    await api.deleteInventory(id)
    await fetchInventory()
  }

  const batchDelete = async (ids: number[]) => {
    await api.batchDeleteInventory(ids)
    await fetchInventory()
  }

  return {
    inventoryList,
    total,
    loading,
    fetchInventory,
    createInventory,
    updateInventory,
    deleteInventory,
    batchDelete,
  }
})
