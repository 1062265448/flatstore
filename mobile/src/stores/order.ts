import { defineStore } from 'pinia'
import { ref } from 'vue'
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
      const res = await api.getOrderList(params) as any
      orderList.value = res.data
      total.value = res.total
    } finally {
      loadingList.value = false
    }
  }

  const fetchOrderById = async (id: number) => {
    loadingDetail.value = true
    try {
      const res = await api.getOrderById(id) as any
      currentOrder.value = res
      return res
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

  // Backward compat: expose `loading` as computed from both
  const loading = ref(false)

  return { orderList, currentOrder, total, loading, loadingList, loadingDetail, fetchOrders, fetchOrderById, createOrder, shipOrder, deliverOrder, cancelOrder, deleteOrder }
})
