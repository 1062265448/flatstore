import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Statistics } from '@/types'
import * as api from '@/api/distribution'

export const useStatisticsStore = defineStore('statistics', () => {
  const stats = ref<Statistics | null>(null)
  const loading = ref(false)

  const fetchStatistics = async () => {
    loading.value = true
    try {
      const res = await api.getStatistics() as any
      stats.value = res
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, fetchStatistics }
})
