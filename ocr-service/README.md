# Flatstore OCR 票据识别服务

基于 PaddleOCR 的本地票据识别微服务，作为 flatstore 项目的 AI Vision 识别前置层。

## 架构

```
前端 → NestJS → OCR Service (PaddleOCR CPU)
                    ↓ (失败)
                AI Vision (智谱 GLM-4V / 豆包)
```

## 安装

```bash
pip install -r requirements.txt
```

> Windows 上 paddlepaddle 2.6.1 CPU 版本可能需要额外安装 Visual C++ Redistributable。

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

## 注意事项

- 纯 CPU 模式，首次加载模型约 10-30 秒
- 单包识别约 1-3 秒（取决于图片大小）
- 置信度低于 0.5 时返回 error，触发 NestJS 侧 AI Vision 降级
