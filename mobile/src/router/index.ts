import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页', tab: 'home', requiresAuth: true },
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/InventoryView.vue'),
    meta: { title: '库存', tab: 'inventory', requiresAuth: true },
  },
  {
    path: '/inventory/:id',
    name: 'InventoryDetail',
    component: () => import('@/views/InventoryDetail.vue'),
    meta: { title: '库存详情', requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/OrdersView.vue'),
    meta: { title: '配货', tab: 'orders', requiresAuth: true },
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: () => import('@/views/OrderDetail.vue'),
    meta: { title: '配货单详情', requiresAuth: true },
  },
  {
    path: '/ai',
    name: 'Ai',
    component: () => import('@/views/AiView.vue'),
    meta: { title: 'AI识别', requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '我的', tab: 'profile', requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '平面库'} — 平面库配货`
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
  const token = localStorage.getItem('token')
  if (requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router
