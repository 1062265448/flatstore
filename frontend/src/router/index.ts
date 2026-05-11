import { createRouter, createWebHistory } from 'vue-router'

// DEV 模式下包含测试路由
const DEV = import.meta.env.DEV

const baseRoutes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘', requiresAuth: true },
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    meta: { title: '库存管理', requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/Orders.vue'),
    meta: { title: '配货单管理', requiresAuth: true },
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/views/Customers.vue'),
    meta: { title: '客户管理', requiresAuth: true },
  },
  {
    path: '/ai',
    name: 'AI',
    component: () => import('@/views/AI.vue'),
    meta: { title: 'AI 图像识别', requiresAuth: true },
  },
  {
    path: '/warehouse',
    name: 'Warehouse',
    component: () => import('@/views/Warehouse.vue'),
    meta: { title: '3D 仓库', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
]

// DEV 环境额外路由
const devRoutes = DEV ? [
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/Test.vue'),
    meta: { title: 'API 测试' },
  },
] : []

const notFoundRoute = {
  path: '/:pathMatch(.*)*',
  redirect: '/',
}

const routes = [...baseRoutes, ...devRoutes, notFoundRoute]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '平面库'} - 平面库配货模块`

  // 检查路由是否需要认证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const token = localStorage.getItem('token')

  if (requiresAuth && token) {
    // 验证 token 是否过期
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        // token 已过期
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
      }
    } catch {
      // token 格式无效，当作无 token 处理
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  if (requiresAuth && !localStorage.getItem('token')) {
    // 如果需要认证且没有 token，重定向到登录页
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && localStorage.getItem('token')) {
    // 如果已登录却访问登录页，重定向到首页
    next({ path: '/' })
  } else {
    next()
  }
})

export default router
