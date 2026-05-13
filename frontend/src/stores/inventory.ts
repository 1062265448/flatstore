import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import * as api from '@/api/distribution'
import type { InventoryStock, CreateInventoryDto, UpdateInventoryDto, InventoryQuery } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref<InventoryStock[]>([])
  const total = ref(0)
  const loading = ref(false)

  let abortController: AbortController | null = null

  const fetchInventory = async (params: InventoryQuery = {}) => {
    // 取消上一次未完成的请求，防止旧响应覆盖新数据
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    loading.value = true
    try {
      const res = await api.getInventoryList(params, signal) as { data: InventoryStock[]; total: number }
      if (signal.aborted) return
      inventoryList.value = res.data
      total.value = res.total
      // 后端返回了总数但当前页无数据 → 页码超出范围，回到第 1 页
      if (res.data.length === 0 && res.total > 0 && (params.page ?? 1) > 1) {
        return fetchInventory({ ...params, page: 1 })
      }
    } catch (error: any) {
      // CanceledError/AbortError 表示请求被取消，静默忽略
      if (axios.isCancel?.(error) || error?.name === 'CanceledError' || error?.name === 'AbortError') return
      // 保留现有数据，不清空（网络抖动时列表依然可见）
    } finally {
      if (!signal.aborted) loading.value = false
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
