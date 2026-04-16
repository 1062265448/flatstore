import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘' },
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    meta: { title: '库存管理' },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/Orders.vue'),
    meta: { title: '配货单管理' },
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/views/Customers.vue'),
    meta: { title: '客户管理' },
  },
  {
    path: '/ai',
    name: 'AI',
    component: () => import('@/views/AI.vue'),
    meta: { title: 'AI 图像识别' },
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/Test.vue'),
    meta: { title: 'API 测试' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '平面库'} - 平面库配货模块`
  next()
})

export default router
