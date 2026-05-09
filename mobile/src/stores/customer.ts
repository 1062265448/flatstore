import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { Customer, CreateCustomerDto } from '@/types'

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)

  const fetchCustomers = async () => {
    loading.value = true
    try {
      const res = await api.getCustomers() as any
      customers.value = Array.isArray(res) ? res : res.data || []
    } finally {
      loading.value = false
    }
  }

  const createCustomer = async (dto: CreateCustomerDto) => {
    const res = await api.createCustomer(dto)
    await fetchCustomers()
    return res
  }

  return { customers, loading, fetchCustomers, createCustomer }
})
