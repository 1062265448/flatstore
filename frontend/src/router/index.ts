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
  {
    path: '/demos',
    name: 'DemoSelector',
    component: () => import('@/views/DemoSelector.vue'),
    meta: { title: '3D Demo 选择' },
  },
  {
    path: '/demo-industrial',
    name: 'DemoIndustrial',
    component: () => import('@/views/Demo1_Industrial.vue'),
    meta: { title: 'Demo1: 工业写实风格' },
  },
  {
    path: '/demo-modern',
    name: 'DemoModern',
    component: () => import('@/views/Demo2_Modern.vue'),
    meta: { title: 'Demo2: 简约现代风格' },
  },
  {
    path: '/demo-cyberpunk',
    name: 'DemoCyberpunk',
    component: () => import('@/views/Demo3_Cyberpunk.vue'),
    meta: { title: 'Demo3: 科幻未来风格' },
  },
  {
    path: '/demo-rts',
    name: 'DemoRTS',
    component: () => import('@/views/Demo4_RTS.vue'),
    meta: { title: 'Demo4: RTS 游戏风格' },
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
