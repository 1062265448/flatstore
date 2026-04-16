import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as api from '@/api/distribution'
import { useCustomerStore } from '../customer'

// Mock API
vi.mock('@/api/distribution', () => ({
  getCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
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

describe('useCustomerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('应正确初始化状态', () => {
    const store = useCustomerStore()
    expect(store.customers).toEqual([])
    expect(store.loading).toBe(false)
  })

  describe('fetchCustomers', () => {
    it('应获取客户列表', async () => {
      const mockCustomers = [
        { id: 1, name: '客户A', phone: '13800138000' },
        { id: 2, name: '客户B', phone: '13800138001' },
      ]
      ;(api.getCustomers as any).mockResolvedValue(mockCustomers)

      const store = useCustomerStore()
      await store.fetchCustomers()

      expect(store.customers).toEqual(mockCustomers)
      expect(store.loading).toBe(false)
    })

    it('应处理加载状态', async () => {
      ;(api.getCustomers as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10)),
      )

      const store = useCustomerStore()
      const fetchPromise = store.fetchCustomers()

      expect(store.loading).toBe(true)
      await fetchPromise
      expect(store.loading).toBe(false)
    })
  })

  describe('createCustomer', () => {
    it('应创建客户并刷新列表', async () => {
      const newCustomer = { id: 1, name: '新客户', phone: '13800138000' }
      ;(api.createCustomer as any).mockResolvedValue(newCustomer)
      ;(api.getCustomers as any).mockResolvedValue([newCustomer])

      const store = useCustomerStore()
      const dto = { name: '新客户', phone: '13800138000' }
      await store.createCustomer(dto)

      expect(api.createCustomer).toHaveBeenCalledWith(dto)
      expect(store.customers.length).toBe(1)
    })
  })

  describe('updateCustomer', () => {
    it('应更新客户并刷新列表', async () => {
      const updatedCustomer = { id: 1, name: '更新后客户', phone: '13800138000' }
      ;(api.updateCustomer as any).mockResolvedValue(updatedCustomer)
      ;(api.getCustomers as any).mockResolvedValue([updatedCustomer])

      const store = useCustomerStore()
      await store.updateCustomer(1, { name: '更新后客户' })

      expect(api.updateCustomer).toHaveBeenCalledWith(1, { name: '更新后客户' })
    })
  })

  describe('deleteCustomer', () => {
    it('应删除客户并刷新列表', async () => {
      ;(api.deleteCustomer as any).mockResolvedValue(undefined)
      ;(api.getCustomers as any).mockResolvedValue([])

      const store = useCustomerStore()
      await store.deleteCustomer(1)

      expect(api.deleteCustomer).toHaveBeenCalledWith(1)
    })
  })
})
