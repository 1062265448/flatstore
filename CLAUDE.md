# 平面库配货模块

平面库配货模块是一个完整的仓库库存批次管理系统，支持库存录入、AI 图像识别、配货单管理等核心功能，同时提供 3D 仓库可视化展示。

## 技术栈

| 端 | 技术 |
|----|------|
| **后端** | NestJS 10 + Prisma 6.19.3 + MySQL 8.0 + 阿里云千问 qwen-vl-plus |
| **前端** | Vue 3 (Composition API) + TypeScript + Vite 5 + Element Plus + Pinia + ECharts + Three.js |
| **数据库** | MySQL 8.0 (Docker) |
| **3D 可视化** | Three.js + WebGL |

## 快速启动

### 1. 启动数据库

```bash
cd /d/Flatstore
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
# API: http://localhost:3002
# Swagger: http://localhost:3002/api
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# http://localhost:5174
```

## 项目结构

```
Flatstore/
├── frontend/                      # Vue 3 前端
│   ├── src/
│   │   ├── api/                  # API 接口
│   │   │   ├── request.ts        # Axios 封装
│   │   │   └── distribution.ts   # 业务接口
│   │   ├── stores/               # Pinia 状态管理
│   │   ├── views/               # 页面组件
│   │   │   ├── Dashboard.vue     # 仪表盘
│   │   │   ├── Inventory.vue     # 库存管理
│   │   │   ├── Orders.vue        # 配货单
│   │   │   ├── Customers.vue     # 客户管理
│   │   │   ├── AI.vue           # AI 图像识别
│   │   │   └── Demo*.vue         # 3D 可视化 Demo
│   │   └── router/index.ts      # 路由配置
│   └── .env                      # VITE_API_BASE_URL=http://localhost:3002
│
├── backend/                       # NestJS 后端
│   ├── src/
│   │   ├── main.ts               # 入口（CORS/Swagger/静态文件）
│   │   ├── distribution/          # 配货模块
│   │   │   ├── distribution.controller.ts
│   │   │   ├── distribution.service.ts
│   │   │   └── dto/
│   │   └── common/services/qwen-ai.service.ts
│   ├── prisma/schema.prisma
│   └── .env
│
├── docker-compose.yml             # MySQL 8.0 配置
├── CLAUDE.md                      # 开发规范
└── 开发日志.md                    # 完整开发记录
```

## 功能模块

### 1. 库存管理

| API | 说明 |
|-----|------|
| `GET /distribution/inventory` | 分页查询 |
| `POST /distribution/inventory` | 创建 |
| `POST /distribution/inventory/batch` | 批量创建 |
| `PATCH /distribution/inventory/:id` | 更新 |
| `DELETE /distribution/inventory/:id` | 删除 |

### 2. 配货单管理

状态机：`draft → shipping → shipped`

| API | 说明 |
|-----|------|
| `POST /distribution/orders` | 创建（自动锁定库存） |
| `POST /distribution/orders/:id/ship` | 发货 |
| `POST /distribution/orders/:id/deliver` | 完成发运 |
| `POST /distribution/orders/:id/cancel` | 取消 |
| `DELETE /distribution/orders/:id` | 删除（仅 cancelled/shipped） |

### 3. AI 图像识别

```bash
curl -X POST http://localhost:3002/distribution/inventory/ai-recognize \
  -F "file=@ticket.jpg"
```

- 自动保存识别历史到数据库
- 支持批量导入库存

### 4. 3D 仓库可视化

| 路径 | Demo | 风格 |
|------|------|------|
| `/demos` | DemoSelector | Demo 选择页 |
| `/demo-industrial` | Demo1 | 工业写实风格 |
| `/demo-modern` | Demo2 | 简约现代风格 |
| `/demo-cyberpunk` | Demo3 | 科幻未来风格 |
| `/demo-rts` | Demo4 | RTS 游戏风格 |

## 环境变量

**后端** `backend/.env`:
```
DATABASE_URL="mysql://root:root123456@localhost:3306/flat_library?charset=utf8mb4"
QWEN_API_KEY="sk-xxx"
FRONTEND_URL="http://localhost:5174"
PORT=3002
```

**前端** `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3002
```

## 数据库配置

Docker Compose 已配置 utf8mb4 字符集：

```yaml
command:
  - --character-set-server=utf8mb4
  - --collation-server=utf8mb4_unicode_ci
  - --init-connect=SET NAMES utf8mb4
```
