import { setActivePinia, createPinia } from 'pinia'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as api from '@/api/distribution'
import { useInventoryStore } from '../inventory'

// Mock API
vi.mock('@/api/distribution', () => ({
  getInventoryList: vi.fn(),
  createInventory: vi.fn(),
  updateInventory: vi.fn(),
  deleteInventory: vi.fn(),
  batchDeleteInventory: vi.fn(),
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

describe('useInventoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('应正确初始化状态', () => {
    const store = useInventoryStore()

    expect(store.inventoryList).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
  })

  describe('fetchInventory', () => {
    it('应获取库存列表', async () => {
      const mockData = [
        { id: 1, batchNo: 'BATCH001', grade: 'A', weight: 100 },
        { id: 2, batchNo: 'BATCH002', grade: 'B', weight: 200 },
      ]
      ;(api.getInventoryList as any).mockResolvedValue({
        data: mockData,
        total: 2,
      })

      const store = useInventoryStore()
      await store.fetchInventory({ page: 1, limit: 20 })

      expect(store.inventoryList).toEqual(mockData)
      expect(store.total).toBe(2)
      expect(store.loading).toBe(false)
    })

    it('应处理加载状态', async () => {
      ;(api.getInventoryList as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [], total: 0 }), 10)),
      )

      const store = useInventoryStore()
      const fetchPromise = store.fetchInventory()

      expect(store.loading).toBe(true)

      await fetchPromise
      expect(store.loading).toBe(false)
    })

    it('应正确传递查询参数', async () => {
      ;(api.getInventoryList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useInventoryStore()
      await store.fetchInventory({ grade: 'A', status: 'available' })

      expect(api.getInventoryList).toHaveBeenCalledWith({
        grade: 'A',
        status: 'available',
      })
    })
  })

  describe('createInventory', () => {
    it('应创建库存并刷新列表', async () => {
      const newItem = { id: 1, batchNo: 'BATCH001', grade: 'A', weight: 100 }
      ;(api.createInventory as any).mockResolvedValue(newItem)
      ;(api.getInventoryList as any).mockResolvedValue({ data: [newItem], total: 1 })

      const store = useInventoryStore()
      const dto = { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 }
      await store.createInventory(dto)

      expect(api.createInventory).toHaveBeenCalledWith(dto)
      expect(store.inventoryList.length).toBe(1)
    })
  })

  describe('updateInventory', () => {
    it('应更新库存并刷新列表', async () => {
      const updatedItem = { id: 1, batchNo: 'BATCH001', grade: 'B', weight: 100 }
      ;(api.updateInventory as any).mockResolvedValue(updatedItem)
      ;(api.getInventoryList as any).mockResolvedValue({ data: [updatedItem], total: 1 })

      const store = useInventoryStore()
      await store.updateInventory(1, { grade: 'B' })

      expect(api.updateInventory).toHaveBeenCalledWith(1, { grade: 'B' })
    })
  })

  describe('deleteInventory', () => {
    it('应删除库存并刷新列表', async () => {
      ;(api.deleteInventory as any).mockResolvedValue(undefined)
      ;(api.getInventoryList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useInventoryStore()
      await store.deleteInventory(1)

      expect(api.deleteInventory).toHaveBeenCalledWith(1)
    })
  })

  describe('batchDelete', () => {
    it('应批量删除库存并刷新列表', async () => {
      ;(api.batchDeleteInventory as any).mockResolvedValue({ count: 3 })
      ;(api.getInventoryList as any).mockResolvedValue({ data: [], total: 0 })

      const store = useInventoryStore()
      await store.batchDelete([1, 2, 3])

      expect(api.batchDeleteInventory).toHaveBeenCalledWith([1, 2, 3])
    })
  })
})
