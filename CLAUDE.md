# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

平面库配货模块 — 管理仓库库存批次的全生命周期：库存录入 → 创建配货单 → 锁定库存 → 发货 → 完成发运。

## 技术栈

**后端**: NestJS 10 + Prisma 6.19.3（锁定版本！） + MySQL 8.0 + 阿里云千问 qwen-vl-plus

**前端**: Vue 3 (Composition API) + TypeScript + Vite 5 + Element Plus + Pinia + ECharts

## 常用命令

### 后端
```bash
cd backend
npm install
npx prisma generate        # 生成 Prisma Client
npx prisma db push        # 同步数据库 Schema
npm run build             # 构建
npm run start:dev         # 开发模式启动
```

### 前端
```bash
cd frontend
npm install
npm run dev              # 开发模式
npm run build            # 构建生产版本
```

## 核心架构

### 后端模块结构（单模块方案）
```
backend/src/
├── main.ts                           # CORS/ValidationPipe/Swagger/静态文件
├── app.module.ts
├── distribution/                     # 配货模块（内聚所有功能）
│   ├── distribution.controller.ts   # REST API: /distribution/*
│   ├── distribution.service.ts      # 业务逻辑
│   └── dto/                         # DTO 定义
├── common/
│   └── services/qwen-ai.service.ts  # AI 识别服务
└── prisma/
    └── prisma.service.ts
```

### 前端结构
```
frontend/src/
├── api/request.ts     # ⚠️ Axios 封装（响应拦截器已解包一层）
├── stores/            # Pinia Store
├── views/             # 页面组件
└── components/       # 通用组件
```

### 核心实体
- **InventoryStock** — 库存批次（品级、重量、片数、状态）
- **DistributionOrder** — 配货单（状态机：draft → confirmed → shipping → shipped/cancelled）
- **Customer** — 客户
- **DistributionOrderItem** — 配货单明细（多对多关联）
- **AiRecognitionHistory** — AI 识别历史

## ⚠️ 关键注意事项（37项历史修复经验）

### 1. Prisma 版本锁定
```
package.json: "prisma": "6.19.3"
```
Prisma 7 不兼容当前 MySQL 适配器，必须锁定 6.19.3 版本。

### 2. Schema + DTO 必须同时定义字段
如果 Schema 有 `remark` 字段但 DTO 未定义，前端传 `remark` 会报 400 错误。

### 3. packageNo 类型
Schema 用 `VARCHAR(50)`，不用 `INT`。AI 返回数字需转为字符串。

### 4. Axios 响应数据访问（致命问题）
```typescript
// ⚠️ Axios 拦截器已解包 response.data，res.data 直接是数组
const res = await getInventoryList(params)
inventoryList.value = res.data      // ✅ res.data 就是数组
total.value = res.total             // ✅ 直接访问

// ❌ 错误：inventoryList.value = res.data.items
```

### 5. 文件上传规范
- 字段名是 `file`，不是 `image`
- **不手动设置 Content-Type**，让浏览器自动添加 boundary
- 后端限制 10MB，只允许图片格式

### 6. AI 识别
- 超时 120 秒（axios + AbortSignal 双重保险）
- AI 返回 `netWeight` 或 `weight`，映射到前端 `weight`
- `packageNo` 从 number 转为 string

### 7. 数据库规范
- 必须使用 utf8mb4 字符集（避免中文乱码）
- 软删除用 `deletedAt` 字段
- 高频查询字段添加索引

### 8. 性能优化
- **批量查询替代 N+1 循环**：
```typescript
// ❌ N+1
for (const item of items) {
  const stock = await this.prisma.inventoryStock.findUnique({ where: { id: item.stockId } });
}

// ✅ 批量
const stocks = await this.prisma.inventoryStock.findMany({
  where: { id: { in: items.map(i => i.stockId) } }
});
const stockMap = new Map(stocks.map(s => [s.id, s]));
```

- **聚合查询替代多次 count**：
```typescript
// ✅ 一次查询获取所有统计
const stats = await this.prisma.inventoryStock.groupBy({
  by: ['status'],
  _count: { id: true },
  _sum: { weight: true, pieceCount: true },
});
```

### 9. 库存状态机
```
available → reserved → shipped
```
创建配货单时通过事务锁定库存（status → 'reserved'），防止超卖。

### 10. API 响应格式
```typescript
// 后端返回格式
{ success: boolean, data: T, message?: string, total?: number, page?: number }

// 分页响应：{ data: [...数组], total: 100, page: 1, pageSize: 20 }
// ⚠️ data 直接是数组，不是 { items: [...] }
```

## 页面路由

| 路径 | 页面 |
|------|------|
| `/` | 仪表盘（统计卡片 + ECharts） |
| `/inventory` | 库存管理 |
| `/orders` | 配货单管理 |
| `/customers` | 客户管理 |
| `/ai` | AI 图像识别 |

## 环境变量

**后端** (backend/.env):
```
DATABASE_URL="mysql://flat_user:flat_pass@localhost:3306/flat_library"
QWEN_API_KEY="sk-xxx"              # ⚠️ 从环境变量读取，禁止硬编码
FRONTEND_URL="http://localhost:5174"
```

**前端** (frontend/.env):
```
VITE_API_BASE_URL=http://localhost:3002
```

## 数据库配置

MySQL 必须配置 utf8mb4：
```yaml
# docker-compose.yml
command: >
  --character-set-server=utf8mb4
  --collation-server=utf8mb4_unicode_ci
  --init-connect='SET NAMES utf8mb4'
```

## 静默失败型错误防范

这类错误代码运行不报错，但功能完全失效：

| 错误类型 | 根因 | 防范 |
|---------|------|------|
| 列表永远为空 | `res.data.items` 应为 `res.data` | ⚠️ 类型定义 + 注释 |
| AI 识别解析失败 | 响应层级解包错误 | ⚠️ 明确响应类型 |
| 主题切换后图表不更新 | 直接读 DOM 类名，非响应式 | ⚠️ 使用 themeStore |
| multipart 解析失败 | 手动设置 Content-Type | ⚠️ 不设置 headers |

## 前端 Store 数据绑定规范

```typescript
// stores/inventory.ts
export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref<InventoryItem[]>([])
  const total = ref(0)

  const fetchInventory = async (params: QueryParams) => {
    // ⚠️ Axios 已解包，直接访问 res.data
    const res = await getInventoryList(params)
    inventoryList.value = res.data      // ✅ 正确
    total.value = res.total
  }
})
```

## 开发质量检查清单

**后端**:
- [ ] `prisma generate` 无错误
- [ ] `prisma db push` 同步数据库
- [ ] DTO 验证覆盖所有 Schema 字段
- [ ] 事务包裹所有库存状态变更
- [ ] 批量查询替代 N+1 循环
- [ ] GlobalExceptionFilter 注册
- [ ] fileFilter 白名单校验
- [ ] QWEN_API_KEY 从环境变量读取

**前端**:
- [ ] Axios 响应拦截器注释说明已解包
- [ ] 分页响应使用 `res.data`（数组）而非 `res.data.items`
- [ ] AI 识别不手动设置 Content-Type
- [ ] 加载提示使用 `duration: 0`
- [ ] router-view 使用 `v-slot` 插槽
- [ ] 主题系统使用 `themeStore` 而非直接读 DOM
