import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as api from '@/api/distribution'
import { useOrderStore } from '../order'

// Mock API
vi.mock('@/api/distribution', () => ({
  getOrderList: vi.fn(),
  getOrderById: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  batchDeleteOrders: vi.fn(),
  shipOrder: vi.fn(),
  deliverOrder: vi.fn(),
  cancelOrder: vi.fn(),
}))

// Mock ElMessage
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('useOrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('应正确初始化状态', () => {
    const store = useOrderStore()

    expect(store.orderList).toEqual([])
    expect(store.currentOrder).toBeNull()
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
  })

  describe('fetchOrders', () => {
    it('应获取订单列表', async () => {
      const mockData = [
        { id: 1, orderNo: 'ORD-001', status: 'draft', customerId: 1 },
        { id: 2, orderNo: 'ORD-002', status: 'confirmed', customerId: 2 },
      ]
      ;(api.getOrderList as any).mockResolvedValue({
        data: mockData,
        total: 2,
      })

      const store = useOrderStore()
      await store.fetchOrders()

      expect(store.orderList).toEqual(mockData)
      expect(store.total).toBe(2)
    })

    it('应支持状态过滤', async () => {
      ;(api.getOrderList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useOrderStore()
      await store.fetchOrders({ status: 'draft' })

      expect(api.getOrderList).toHaveBeenCalledWith({ status: 'draft' }, expect.any(AbortSignal))
    })
  })

  describe('fetchOrderById', () => {
    it('应获取单个订单详情', async () => {
      const mockOrder = { id: 1, orderNo: 'ORD-001', status: 'draft', items: [] }
      ;(api.getOrderById as any).mockResolvedValue(mockOrder)

      const store = useOrderStore()
      const result = await store.fetchOrderById(1)

      expect(store.currentOrder).toEqual(mockOrder)
      expect(result).toEqual(mockOrder)
    })
  })

  describe('订单状态机操作', () => {

    it('shipOrder 应发货', async () => {
      ;(api.shipOrder as any).mockResolvedValue(undefined)
      ;(api.getOrderList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useOrderStore()
      await store.shipOrder(1)

      expect(api.shipOrder).toHaveBeenCalledWith(1)
    })
    it('cancelOrder 应取消订单', async () => {
      ;(api.cancelOrder as any).mockResolvedValue(undefined)
      ;(api.getOrderList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useOrderStore()
      await store.cancelOrder(1)

      expect(api.cancelOrder).toHaveBeenCalledWith(1)
    })
  })

  describe('deleteOrder', () => {
    it('应删除订单并刷新列表', async () => {
      ;(api.deleteOrder as any).mockResolvedValue(undefined)
      ;(api.getOrderList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useOrderStore()
      await store.deleteOrder(1)

      expect(api.deleteOrder).toHaveBeenCalledWith(1)
    })
  })

  describe('batchDelete', () => {
    it('应批量删除订单', async () => {
      ;(api.batchDeleteOrders as any).mockResolvedValue(undefined)
      ;(api.getOrderList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useOrderStore()
      await store.batchDelete([1, 2, 3])

      expect(api.batchDeleteOrders).toHaveBeenCalledWith([1, 2, 3])
    })
  })
})
