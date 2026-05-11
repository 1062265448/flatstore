import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/api/distribution'
import type { DistributionOrder, CreateOrderDto, ShipOrderDto, OrderQuery } from '@/types'

export const useOrderStore = defineStore('order', () => {
  const orderList = ref<DistributionOrder[]>([])
  const currentOrder = ref<DistributionOrder | null>(null)
  const total = ref(0)
  const loadingList = ref(false)
  const loadingDetail = ref(false)

  const fetchOrders = async (params: OrderQuery = {}) => {
    loadingList.value = true
    try {
      const res = await api.getOrderList(params) as { data: DistributionOrder[]; total: number }
      orderList.value = res.data
      total.value = res.total
    } catch (error) {
      // 错误已在 API 拦截器中提示
      orderList.value = []
      total.value = 0
    } finally {
      loadingList.value = false
    }
  }

  const fetchOrderById = async (id: number) => {
    loadingDetail.value = true
    try {
      const res = await api.getOrderById(id) as DistributionOrder
      currentOrder.value = res
      return res
    } catch (error) {
      // 错误已在 API 拦截器中提示
      currentOrder.value = null
    } finally {
      loadingDetail.value = false
    }
  }

  const createOrder = async (dto: CreateOrderDto) => {
    const res = await api.createOrder(dto)
    return res
  }

  const shipOrder = async (id: number, dto: ShipOrderDto) => {
    await api.shipOrder(id, dto)
  }

  const deliverOrder = async (id: number) => {
    await api.deliverOrder(id)
  }

  const cancelOrder = async (id: number) => {
    await api.cancelOrder(id)
  }

  const deleteOrder = async (id: number) => {
    await api.deleteOrder(id)
  }

  return { orderList, currentOrder, total, loading: computed(() => loadingList.value || loadingDetail.value), loadingList, loadingDetail, fetchOrders, fetchOrderById, createOrder, shipOrder, deliverOrder, cancelOrder, deleteOrder }
})
