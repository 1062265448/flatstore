<div align="center">

# 🏭 Flatstore — 平面库配货系统

> **车间镍材库存管理 · AI图像识别 · 3D仓库可视化**

</div>

---

## 📋 项目概览

Flatstore 是一个面向车间场景的**镍材库存配货管理系统**，覆盖从库存录入 → AI识别 → 创建配货单 → 锁定库存 → 发货的全生命周期。同时集成阿里云千问大模型进行图像识别，以及 Three.js 实现的 3D 仓库建模。

| 特性 | 说明 |
|------|------|
| ⚙️ **前端** | Vue 3 (Composition API) + TypeScript + Vite 5 + Element Plus + Pinia |
| 🖥️ **后端** | NestJS 10 + Prisma 6.19.3 + MySQL 8.0 |
| 🤖 **AI** | 阿里云千问 qwen-vl-plus 图像识别 |
| 🏗 **3D** | Three.js + WebGL（基于真实图纸 120m × 66m 建模） |
| 📊 **可视化** | ECharts 趋势图 + 主题切换 |
| 📱 **移动端** | Capacitor Android 适配（异形屏/暗色模式/手势交互） |
| ✅ **测试** | Playwright E2E + Vitest 单元测试 |

---

## ✨ 核心功能

### 📦 库存管理
- 库存批次的增删改查，支持分页、筛选、排序
- 品级 / 产品类型 / 存储位置多维度管理
- 软删除机制，数据可追溯

### 📋 配货单管理
- 完整的状态机：草稿 → 已锁定 → 已发货 → 已完成
- 关联库存批次，自动计算总重量与总片数
- 支持批量导入 / 手动创建

### 🤖 AI 图像识别
- 对接阿里云千问 qwen-vl-plus 模型
- 上传图片自动识别库存批次信息
- 识别历史记录可追溯、可复查

### 🏗 3D 仓库可视化
- 基于真实车间图纸（120m × 66m）精确建模
- 约 2000 个仓储点网格，6 个仓储分区
- 三厂区 / 二厂区切换
- 4 种 3D 风格 Demo（工业 / 现代 / 赛博朋克 / RTS）

### 📱 移动端适配
- Capacitor Android 真机运行
- 异形屏 safe-area 适配
- 暗色模式 + 手势交互

---

## 🚀 快速开始

### 环境要求
- **Node.js** ≥ 18
- **Docker**（用于 MySQL 8.0）
- **pnpm** 或 **npm**

### 1. 启动数据库

```bash
# MySQL 8.0 via Docker
docker run -d \
  --name flatstore-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=flatstore \
  -p 3306:3306 \
  mysql:8.0
```

### 2. 启动后端

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

➡️ API: `http://localhost:3002`  
📖 Swagger 文档: `http://localhost:3002/api`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

➡️ 页面: `http://localhost:5174`

---

## 🏗 项目结构

```
Flatstore/
├── frontend/                          # Vue 3 前端
│   ├── src/
│   │   ├── api/                       # API 接口封装
│   │   │   ├── request.ts             # Axios 封装（响应拦截器已解包）
│   │   │   └── distribution.ts        # 业务接口
│   │   ├── stores/                    # Pinia 状态管理
│   │   │   ├── inventory.ts           # 库存 Store
│   │   │   └── order.ts               # 配货单 Store
│   │   ├── views/                     # 页面组件
│   │   │   ├── Dashboard.vue          # 仪表盘（ECharts 统计）
│   │   │   ├── Inventory.vue          # 库存管理
│   │   │   ├── Orders.vue             # 配货单管理
│   │   │   ├── Customers.vue          # 客户管理
│   │   │   ├── AI.vue                 # AI 图像识别
│   │   │   ├── Warehouse.vue          # 3D 仓库可视化
│   │   │   └── Demo*.vue              # 3D 风格 Demo（4种）
│   │   ├── router/index.ts            # 路由配置
│   │   ├── styles/                    # 全局样式（玻璃态设计系统）
│   │   ├── three/                     # Three.js 3D 模块
│   │   └── types/                     # TypeScript 类型定义
│   ├── tests/                         # Playwright E2E 测试
│   └── vite.config.ts                 # Vite 构建配置
│
├── backend/                           # NestJS 后端
│   ├── src/
│   │   ├── main.ts                    # 入口（CORS/Swagger/静态文件）
│   │   ├── distribution/              # 配货模块（MVC）
│   │   │   ├── distribution.controller.ts
│   │   │   ├── distribution.service.ts
│   │   │   └── dto/                   # 数据验证 DTO
│   │   └── common/services/
│   │       └── qwen-ai.service.ts     # 阿里云千问 AI 服务
│   ├── prisma/schema.prisma           # 数据库模型
│   └── test/                          # NestJS 单元测试
│
├── prototypes/                        # 原型设计稿
├── CLAUDE.md                          # 开发规范（AI 辅助开发基准）
├── 平面库配货模块-开发文档.md           # 完整技术文档（12 章）
├── 开发日志.md                         # 版本演进与 bug 修复记录
└── 项目评估和优化建议.md                # 自评与改进方案
```

---

## 🗄 数据模型

```
Customer 1 ──< DistributionOrder 1 ──< DistributionOrderItem >── 1 InventoryStock
                                                                        │
                                                        AiRecognitionHistory
```

| 实体 | 说明 | 核心字段 |
|------|------|---------|
| **Customer** | 客户 | name, contact, phone, address |
| **DistributionOrder** | 配货单 | order_no, status(8种), total_weight, total_pieces |
| **DistributionOrderItem** | 配货明细 | weight, piece_count |
| **InventoryStock** | 库存批次 | batch_no, grade, weight, location, status |
| **AiRecognitionHistory** | AI识别记录 | image_url, raw_result, status |

---

## 📊 版本演进

| 版本 | 日期 | 累计修复 | 核心变更 |
|------|------|---------|---------|
| v1.0 | 04-07 | 0 | 项目启动，基础框架搭建 |
| v1.3.x | 04-09~14 | 0 | 功能开发完成（库存/客户/订单/AI） |
| v1.4.0 | 04-15 | 13 | macOS Sonoma 风格 UI + ECharts |
| v1.5.0 | 04-15 | 27 | 主题 Store + 趋势图 + 骨架屏 |
| **v1.6.0** | 05-09 | — | Flatstore Mobile — Capacitor Android 移动端 |
| **v1.8.0** | 05-11 | — | 全项目质量审计 + 移动端 7 项修复 |

---

## 🧪 测试

```bash
# 后端单元测试
cd backend && npm test

# 前端 E2E 测试
cd frontend && npx playwright test

# 前端单元测试
cd frontend && npx vitest
```

---

## 🛠 技术亮点

- **NestJS 模块化架构**：分布模块遵循 MVC 模式，DTO 层使用 class-validator 统一校验
- **Prisma ORM 锁定版本**：6.19.3 版本锁定，避免 Prisma 7 不兼容问题
- **AI 图像识别**：对接阿里云千问 qwen-vl-plus，非简单的 API 调用 —— 含错误重试、格式对齐、历史记录
- **3D 仓库建模**：基于真实车间图纸 120m×66m 精确建模，2000+ 仓储点位
- **玻璃态设计系统**：前端 UI 统一设计变量，支持亮/暗主题切换
- **移动端适配**：Capacitor Android + 异形屏 safe-area + 暗色模式 + 手势交互

---

## 📝 开发文档

详见项目内的完整技术文档：

- [`📄 平面库配货模块-开发文档.md`](./平面库配货模块-开发文档.md) — 12 章完整技术文档（数据库/API/架构/部署）
- [`📄 开发日志.md`](./开发日志.md) — 版本演进与 bug 修复全记录（37+ 项）
- [`📄 CLAUDE.md`](./CLAUDE.md) — AI 辅助开发规范与快速启动指南
- [`📄 项目评估和优化建议.md`](./项目评估和优化建议.md) — 自评与改进路线

---

## 🔮 Roadmap

- [x] 库存管理 CRUD + 分页搜索
- [x] 配货单全流程（草稿→发货→完成）
- [x] AI 图像识别（阿里云千问）
- [x] 3D 仓库可视化（Three.js）
- [x] 移动端 Android 适配（Capacitor）
- [x] 质量审计 + 移动端修复
- [ ] CI/CD（GitHub Actions）
- [ ] OTA 扫码出库
- [ ] 权限管理
- [ ] 数据导出/报表

---

<div align="center">

**Built with ❤️ for the workshop floor**

</div>
