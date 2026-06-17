# Flatstore OCR 票据识别服务

基于 RapidOCR 的本地票据识别微服务，为 flatstore 项目提供纯 OCR 票据识别能力。

## 架构

```
前端 → NestJS → OCR Service (RapidOCR CPU)
```

## 安装

```bash
pip install -r requirements.txt
```

## 启动

```bash
python main.py
# 或
uvicorn main:app --host 0.0.0.0 --port 8765
```

## API

### `POST /recognize`

```json
{
  "image": "base64-encoded-image-data"
}
```

返回：

```json
{
  "success": true,
  "results": [
    {
      "packageNo": "1-40",
      "pieceCount": 0,
      "netWeight": 1850.5,
      "grade": "9997",
      "productType": "电解镍",
      "batchNo": "07-1-001J",
      "date": "2024-01-15",
      "specification": "整板"
    }
  ],
  "warnings": [],
  "confidence": 0.92
}
```

### `GET /health`

```json
{
  "status": "ok",
  "model_loaded": true,
  "service": "flatstore-ocr-service"
}
```

## 进程管理 (pm2)

```bash
# 从项目根目录启动所有服务
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看 OCR 服务日志
pm2 logs flatstore-ocr

# 重启 OCR 服务
pm2 restart flatstore-ocr
```

## 注意事项

- 纯 CPU 模式，首次加载模型约 10-30 秒
- 单包识别约 1-3 秒（取决于图片大小）
- 置信度低于 0.5 时返回 error（可通过 `OCR_CONFIDENCE_THRESHOLD` 环境变量调整）
