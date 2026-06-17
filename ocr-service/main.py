"""
OCR 票据识别微服务 — FastAPI
引擎: RapidOCR (ONNX Runtime, CPU)
端口: 8765

Endpoints:
  POST /recognize  — 接收 base64 图片，返回结构化票据数据
  GET  /health     — 健康检查
"""

import logging
import os
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from ocr_engine import OCREngine
from ticket_parser import parse_ticket

# 置信度阈值：平均置信度低于此值视为识别失败
CONFIDENCE_THRESHOLD = float(os.environ.get("OCR_CONFIDENCE_THRESHOLD", "0.5"))

# base64 图片最大大小限制 (20MB)
MAX_IMAGE_SIZE = 20 * 1024 * 1024

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时预加载模型
    logger.info("启动 RapidOCR 票据识别服务...")
    t0 = time.time()
    engine = OCREngine()
    try:
        engine._init_model()
        elapsed = time.time() - t0
        logger.info(f"模型预加载完成 ({elapsed:.1f}s, engine={engine._engine})")
    except Exception as e:
        logger.warning(f"模型预加载失败（将在首次请求时重试）: {e}")
    yield


app = FastAPI(
    title="Flatstore OCR Service",
    description="RapidOCR 票据识别微服务",
    version="1.0.0",
    lifespan=lifespan,
)


class RecognizeRequest(BaseModel):
    """识别请求体"""
    image: str = Field(..., description="base64 编码的图片")


class RecognizeResult(BaseModel):
    """单个票据行数据"""
    packageNo: Optional[str | int] = None
    pieceCount: int = 0
    netWeight: float = 0.0
    grade: str = ""
    productType: Optional[str] = None
    batchNo: str = ""
    date: str = ""
    specification: Optional[str] = None


class RecognizeResponse(BaseModel):
    """识别响应体"""
    success: bool = True
    results: List[RecognizeResult] = []
    warnings: List[str] = []
    confidence: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool = False
    engine: str = ""
    service: str = "flatstore-ocr-service"


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    engine = OCREngine()
    model_loaded = getattr(engine, '_initialized', False)
    return HealthResponse(
        status="ok",
        model_loaded=model_loaded,
        engine=getattr(engine, '_engine', ''),
    )


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(req: RecognizeRequest):
    """
    票据识别接口。

    接收 base64 编码的图片，返回结构化票据数据。
    如果 OCR 置信度太低或无法解析，返回 error。
    """
    if not req.image or not req.image.strip():
        raise HTTPException(status_code=400, detail="image 字段不能为空")

    # 输入大小限制
    image_size = len(req.image.encode('utf-8'))
    if image_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"图片大小 ({image_size // 1024 // 1024}MB) 超出限制 ({MAX_IMAGE_SIZE // 1024 // 1024}MB)",
        )

    engine = OCREngine()

    try:
        # 步骤 1: OCR 识别
        t0 = time.time()
        ocr_results = engine.recognize(req.image)
        ocr_elapsed = time.time() - t0

        if not ocr_results:
            return RecognizeResponse(
                success=False,
                error="OCR 未识别到任何文字",
            )

        # 计算平均置信度
        avg_conf = sum(r['confidence'] for r in ocr_results) / len(ocr_results)

        # 置信度门槛检查（统一使用 CONFIDENCE_THRESHOLD 环境变量）
        if avg_conf < CONFIDENCE_THRESHOLD:
            return RecognizeResponse(
                success=False,
                error=f'OCR 平均置信度过低 ({avg_conf:.2f} < {CONFIDENCE_THRESHOLD:.2f})',
                confidence=avg_conf,
            )

        # 步骤 2: 票据解析
        t1 = time.time()
        results, warnings = parse_ticket(ocr_results)
        parse_elapsed = time.time() - t1

        # 检查解析结果
        if not results and warnings:
            # 解析失败，返回 error
            return RecognizeResponse(
                success=False,
                error=f"票据解析失败: {'; '.join(warnings)}",
                confidence=avg_conf,
                warnings=warnings,
            )

        # 步骤 3: 转换为响应格式
        converted_results = []
        for r in results:
            converted_results.append(RecognizeResult(
                packageNo=r.get('packageNo'),
                pieceCount=r.get('pieceCount', 0),
                netWeight=r.get('netWeight', 0.0),
                grade=r.get('grade', ''),
                productType=r.get('productType'),
                batchNo=r.get('batchNo', ''),
                date=r.get('date', ''),
                specification=r.get('specification'),
            ))

        total_elapsed = time.time() - t0
        logger.info(f"识别完成: OCR {ocr_elapsed:.2f}s, 解析 {parse_elapsed:.2f}s, 总计 {total_elapsed:.2f}s | {len(converted_results)} 行, 置信度 {avg_conf:.2f}")

        return RecognizeResponse(
            success=True,
            results=converted_results,
            warnings=warnings,
            confidence=avg_conf,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"识别异常: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"识别服务内部错误，请联系管理员",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8765,
        log_level="info",
    )
