import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import * as api from '@/api/distribution'
import type { DistributionOrder, CreateOrderDto, UpdateOrderDto, OrderQuery } from '@/types'

export const useOrderStore = defineStore('order', () => {
  const orderList = ref<DistributionOrder[]>([])
  const currentOrder = ref<DistributionOrder | null>(null)
  const total = ref(0)
  const loading = ref(false)

  let abortController: AbortController | null = null

  const fetchOrders = async (params: OrderQuery = {}) => {
    // 取消上一次未完成的请求，防止旧响应覆盖新数据
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    loading.value = true
    try {
      const res = await api.getOrderList(params, signal) as { data: DistributionOrder[]; total: number }
      if (signal.aborted) return
      orderList.value = res.data
      total.value = res.total
      // 后端返回了总数但当前页无数据 → 页码超出范围，回到第 1 页
      if (res.data.length === 0 && res.total > 0 && (params.page ?? 1) > 1) {
        return fetchOrders({ ...params, page: 1 })
      }
    } catch (error: any) {
      // CanceledError/AbortError 表示请求被取消，静默忽略
      if (axios.isCancel?.(error) || error?.name === 'CanceledError' || error?.name === 'AbortError') return
      // 保留现有数据，不清空（网络抖动时列表依然可见）
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  const fetchOrderById = async (id: number) => {
    loading.value = true
    try {
      const res = await api.getOrderById(id) as DistributionOrder
      currentOrder.value = res
      return res
    } catch (error) {
      currentOrder.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  const createOrder = async (dto: CreateOrderDto) => {
    const res = await api.createOrder(dto)
    await fetchOrders()
    return res
  }

  const updateOrder = async (id: number, dto: UpdateOrderDto) => {
    const res = await api.updateOrder(id, dto)
    await fetchOrders()
    return res
  }

  const deleteOrder = async (id: number) => {
    await api.deleteOrder(id)
    await fetchOrders()
  }

  const batchDelete = async (ids: number[]) => {
    await api.batchDeleteOrders(ids)
    await fetchOrders()
  }

  const shipOrder = async (id: number) => {
    await api.shipOrder(id)
    await fetchOrders()
  }

  const cancelOrder = async (id: number) => {
    await api.cancelOrder(id)
    await fetchOrders()
  }

  return {
    orderList,
    currentOrder,
    total,
    loading,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    batchDelete,
    shipOrder,
    cancelOrder,
  }
})
