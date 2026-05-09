import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/types'

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)

  const fetchCustomers = async () => {
    loading.value = true
    try {
      // ⚠️ Axios 已解包，res 直接是数组
      const res = await api.getCustomers() as any
      customers.value = res
    } finally {
      loading.value = false
    }
  }

  const createCustomer = async (dto: CreateCustomerDto) => {
    const res = await api.createCustomer(dto)
    await fetchCustomers()
    return res
  }

  const updateCustomer = async (id: number, dto: UpdateCustomerDto) => {
    const res = await api.updateCustomer(id, dto)
    await fetchCustomers()
    return res
  }

  const deleteCustomer = async (id: number) => {
    await api.deleteCustomer(id)
    await fetchCustomers()
  }

  return {
    customers,
    loading,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
})
