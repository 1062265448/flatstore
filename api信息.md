# 平面库配货模块 - AI图像识别API信息

## 概述
平面库配货模块使用阿里云千问VL-plus（qwen-vl-plus）模型进行镍板产品票据的图像识别，支持批量导入库存数据。

## 1. 后端API端点

### 基础信息
- **URL**: `POST http://localhost:3002/distribution/inventory/ai-recognize`
- **认证方式**: JWT Bearer Token（需先登录获取token）
- **频率限制**: 10次/分钟（Throttle装饰器）
- **文件大小限制**: 最大10MB
- **支持格式**: JPEG、PNG、GIF、WebP

### 请求示例
```bash
curl -X POST http://localhost:3002/distribution/inventory/ai-recognize \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@ticket.jpg"
```

### 控制器代码位置
`backend/src/distribution/distribution.controller.ts` (第103-140行)

## 2. 阿里云API配置

### 核心参数
- **模型名称**: `qwen-vl-plus`
- **API端点**: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- **API密钥环境变量**: `QWEN_API_KEY`
- **当前测试密钥**: `sk-7520063d83b24e48989e169eaa263906`（位于`backend/.env`）

### API调用配置
```typescript
// qwen-ai.service.ts 第50-75行
const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'qwen-vl-plus',
    messages: [{
      role: 'user',
      content: [
        { 
          type: 'image_url', 
          image_url: { url: `data:image/jpeg;base64,${base64}` } 
        },
        { type: 'text', text: prompt }
      ]
    }]
  }),
  signal: AbortSignal.timeout(120000) // 2分钟超时
});
```

## 3. 文件处理配置

### 上传文件存储
- **存储目录**: `backend/uploads/inventory/`
- **文件名格式**: `timestamp-random.extension` (如: `1714123456789-123456789.jpg`)
- **临时文件清理**: 识别后自动删除

### 文件处理代码
```typescript
// distribution.controller.ts 第115-136行
FileInterceptor('file', {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads/inventory'),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
})
```

## 4. 识别提示词（Prompt）

### 专门针对镍板票据的识别要求
```text
你是一个票据识别专家，专门识别镍板产品票据。请仔细分析这张图片中的表格数据。

## 识别要求

1. **牌号（grade）**：即图片中的"品级"字段，通常为 4 位数字，如 9996、9950、9999 等。请准确识别数字，不要遗漏或篡改。
2. **批号（batchNo）**：格式固定为"XX-X-XXX"模式，例如 26-7-090、26-12-005 等。请保持原始格式，不要转换。
3. **产品类型（productType）**：识别图片左上角"品名"右侧的文字，通常为"镍板"或"电积镍板"等。
4. **包号（packageNo）**：表格中的序号/包号列，通常为数字。
5. **片数（pieceCount）**：每包对应的片数。
6. **净重（netWeight）**：每包的净重量，单位为吨。
7. **检验员（inspector）**：识别检验人员姓名，如无则设为 null。
8. **日期（date）**：识别票据上的日期，格式统一为 YYYY-MM-DD。

## 注意事项

- 提取表格中的**所有数据行**，排除合计行/汇总行/小计行
- 所有行的 productType 应为同一个值（同一张票据的产品类型一致）
- 牌号和批号是关键字段，请仔细核对，确保准确
- 如果某个字段无法识别或模糊不清，设为 null，不要猜测
- 净重可能是小数，请保留原始精度

请返回一个 JSON 数组，每个对象包含以下字段：
- packageNo: 包号（数字）
- pieceCount: 片数（数字）
- netWeight: 净重（数字，单位：吨）
- grade: 牌号（字符串，如"9996"、"9950"）
- productType: 产品类型（字符串，如"镍板"）
- batchNo: 批号（字符串，格式如"26-7-090"）
- inspector: 检验员（字符串或 null）
- date: 日期（字符串，格式 YYYY-MM-DD）

只返回 JSON 数组，不要其他文字说明。
```

## 5. 数据规范化处理

### 结果标准化
```typescript
private normalizeResult(item: any): AiRecognizeResult {
  // 批号标准化：确保格式为 XX-X-XXX
  let batchNo = String(item.batchNo || '').trim();
  if (batchNo) {
    batchNo = batchNo.replace(/\s+/g, ''); // 去除空格
  }

  // 牌号标准化：保留原始字符串，去除前后空格
  const grade = String(item.grade || '').trim();

  // 日期标准化
  let date = String(item.date || '').trim();
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      date = `${y}-${m}-${day}`;
    }
  }

  return {
    packageNo: Number(item.packageNo) || 0,
    pieceCount: Number(item.pieceCount) || 0,
    netWeight: Number(item.netWeight) || 0,
    grade,
    productType: String(item.productType || '').trim() || null as any,
    batchNo,
    inspector: item.inspector ? String(item.inspector).trim() : undefined,
    date,
  };
}
```

## 6. 数据库存储结构

### AI识别历史表 (ai_recognition_history)
```prisma
model AiRecognitionHistory {
  id           Int       @id @default(autoincrement())
  imageUrl     String    @map("image_url") @db.VarChar(200)  // 图片存储路径
  result       String?   @db.Text                           // JSON格式识别结果
  itemCount    Int       @map("item_count")                 // 识别出的数据行数
  status       String    @default("success") @db.VarChar(20) // success/failed
  errorMessage String?   @map("error_message") @db.VarChar(500) // 错误信息
  batchNo      String?   @map("batch_no") @db.VarChar(50)   // 首个批号（用于查询）
  grade        String?   @db.VarChar(20)                    // 首个牌号（用于查询）
  date         DateTime? @db.Date                           // 首个日期（用于查询）
  createdAt    DateTime  @default(now()) @map("created_at") // 创建时间
  
  @@map("ai_recognition_history")
  @@index([status])
  @@index([createdAt(sort: Desc)])
}
```

### 库存表关联字段
```prisma
model InventoryStock {
  // ... 其他字段
  sourceType      String?   @map("source_type") @db.VarChar(20)  // manual/batch_import
  sourceImage     String?   @map("source_image") @db.VarChar(200) // 来源图片路径
  // ...
}
```

## 7. 响应格式

### 成功响应
```json
{
  "results": [
    {
      "packageNo": 1,
      "pieceCount": 50,
      "netWeight": 1.234,
      "grade": "9996",
      "productType": "镍板",
      "batchNo": "26-7-090",
      "inspector": "张三",
      "date": "2024-03-15"
    },
    {
      "packageNo": 2,
      "pieceCount": 48,
      "netWeight": 1.198,
      "grade": "9996",
      "productType": "镍板",
      "batchNo": "26-7-091",
      "inspector": "张三",
      "date": "2024-03-15"
    }
  ],
  "historyId": 123
}
```

### 错误响应
- HTTP状态码非200
- 错误信息记录到数据库`error_message`字段
- 前端会收到统一的错误响应格式

## 8. 批量导入流程

### 识别后导入
1. AI识别返回结果数组
2. 用户确认或修改识别结果
3. 调用批量创建接口：`POST /distribution/inventory/batch`
4. 关联识别历史ID，更新历史记录中的规格信息

### 批量创建请求
```json
{
  "items": [
    {
      "packageNo": "1",
      "batchNo": "26-7-090",
      "grade": "9996",
      "productType": "镍板",
      "weight": 1.234,
      "pieceCount": 50,
      "specification": "标准规格"
    }
  ],
  "recognitionHistoryId": 123
}
```

## 9. 关键文件位置

| 文件 | 路径 | 主要功能 |
|------|------|----------|
| AI服务类 | `backend/src/common/services/qwen-ai.service.ts` | AI识别核心逻辑 |
| 业务服务 | `backend/src/distribution/distribution.service.ts` | 第269-313行，AI识别业务处理 |
| 控制器 | `backend/src/distribution/distribution.controller.ts` | 第103-140行，API端点定义 |
| 环境配置 | `backend/.env` | API密钥配置 |
| 数据库模型 | `backend/prisma/schema.prisma` | 第107-123行，数据表定义 |
| 前端调用 | `frontend/src/api/distribution.ts` | 前端API封装 |

## 10. 安全与监控

### 安全措施
1. **API密钥管理**: 通过环境变量配置，避免硬编码
2. **文件类型验证**: 严格限制上传文件类型
3. **文件大小限制**: 防止大文件攻击
4. **频率限制**: 防止API滥用
5. **错误隔离**: 识别失败不影响系统稳定性

### 监控指标
1. **识别成功率**: 通过`status`字段统计
2. **平均处理时间**: 从上传到返回结果的时间
3. **错误类型分布**: 通过`error_message`分类统计
4. **使用频率**: 通过API调用日志监控

## 11. 维护与扩展

### API密钥更换
1. 修改`backend/.env`中的`QWEN_API_KEY`值
2. 重启后端服务：`npm run start:dev`

### 模型升级
如需更换AI模型：
1. 修改`qwen-ai.service.ts`中的API端点
2. 更新请求参数中的`model`字段
3. 调整提示词以适应新模型特性

### 识别字段扩展
如需识别更多字段：
1. 更新`AiRecognizeResult`接口定义
2. 修改提示词中的识别要求
3. 更新`normalizeResult`方法
4. 调整数据库表结构（如需要持久化）

---

**最后更新**: 2026-04-27  
**文档版本**: 1.0  
**维护者**: Claude Code