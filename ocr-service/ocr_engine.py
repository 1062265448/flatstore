"""
OCR 引擎封装 — 支持 PaddleOCR 和 RapidOCR，默认用 RapidOCR（更快更轻）。
单例模式，CPU 模式。
"""

import os
import base64
import io
import logging
from typing import List, Dict, Any, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# 引擎可选: "rapidocr" | "paddleocr"
# RapidOCR 更快更轻（ONNX Runtime），PaddleOCR 更成熟但依赖重
OCR_ENGINE = os.environ.get("OCR_ENGINE", "rapidocr")


class OCREngine:
    """单例 OCR 引擎"""

    _instance: Optional['OCREngine'] = None
    _rapidocr = None
    _paddleocr = None
    _initialized = False
    _engine: str = ""

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def _init_model(self):
        """懒加载模型"""
        if self._initialized:
            return

        if OCR_ENGINE == "rapidocr":
            self._init_rapidocr()
        else:
            self._init_paddleocr()

    def _init_rapidocr(self):
        """初始化 RapidOCR（推荐，更快更轻）"""
        try:
            from rapidocr_onnxruntime import RapidOCR
        except ImportError:
            logger.warning("RapidOCR 未安装，降级到 PaddleOCR")
            self._init_paddleocr()
            return

        logger.info("正在加载 RapidOCR 模型（CPU 模式）...")
        self._rapidocr = RapidOCR()
        self._engine = "rapidocr"
        self._initialized = True
        logger.info("RapidOCR 模型加载完成")

    def _init_paddleocr(self):
        """初始化 PaddleOCR"""
        try:
            from paddleocr import PaddleOCR
        except ImportError:
            raise RuntimeError("PaddleOCR 未安装，请运行: pip install paddleocr paddlepaddle")

        logger.info("正在加载 PaddleOCR PP-OCRv4 模型（CPU 模式）...")
        self._paddleocr = PaddleOCR(
            use_angle_cls=True,
            lang='ch',
            use_gpu=False,
            show_log=False,
        )
        self._engine = "paddleocr"
        self._initialized = True
        logger.info("PaddleOCR 模型加载完成")

    def _decode_image(self, image_base64: str) -> np.ndarray:
        """解码 base64 → numpy array (RGB)"""
        img_bytes = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        return np.array(img)

    def _parse_results(self, results) -> List[Dict[str, Any]]:
        """统一解析 OCR 返回结果"""
        parsed: List[Dict[str, Any]] = []
        if not results:
            return parsed

        for line in results:
            box = line[0]  # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
            # RapidOCR: [box, text_str, confidence_str] (3 items)
            # PaddleOCR: [box, (text_str, confidence_float)] (2 items)
            if len(line) >= 3:
                # RapidOCR format
                text = str(line[1])
                try:
                    confidence = float(line[2])
                except (ValueError, TypeError):
                    confidence = 0.0
            else:
                # PaddleOCR format
                text = str(line[1][0])
                try:
                    confidence = float(line[1][1])
                except (ValueError, TypeError):
                    confidence = 0.0

            parsed.append({
                'text': text.strip(),
                'confidence': confidence,
                'bbox': box,
                'x_min': min(p[0] for p in box),
                'y_min': min(p[1] for p in box),
                'x_max': max(p[0] for p in box),
                'y_max': max(p[1] for p in box),
                'center_x': (min(p[0] for p in box) + max(p[0] for p in box)) / 2,
                'center_y': (min(p[1] for p in box) + max(p[1] for p in box)) / 2,
            })

        return parsed

    def recognize(self, image_base64: str) -> List[Dict[str, Any]]:
        """
        接收 base64 图片，返回 OCR 结果列表。
        每个结果包含：text, confidence, bbox, center_x, center_y 等
        """
        self._init_model()
        img_array = self._decode_image(image_base64)

        if self._engine == "rapidocr":
            # RapidOCR 返回: (results, elapse)
            results, elapse = self._rapidocr(img_array)
            parsed = self._parse_results(results)
            # elapse is a list of times for detection, classification, recognition
            if isinstance(elapse, list):
                total_time = sum(elapse)
            else:
                total_time = elapse
            logger.info(f"[RapidOCR] 识别到 {len(parsed)} 个文本块, 耗时 {total_time:.2f}s")
        else:
            # PaddleOCR 返回: [[box, (text, confidence)], ...]
            results = self._paddleocr.ocr(img_array, cls=True)
            if results and results[0]:
                parsed = self._parse_results(results[0])
            else:
                parsed = []
            logger.info(f"[PaddleOCR] 识别到 {len(parsed)} 个文本块")

        return parsed

    def recognize_file(self, file_path: str) -> List[Dict[str, Any]]:
        """从文件路径识别（用于测试）"""
        self._init_model()
        img_array = np.array(Image.open(file_path).convert('RGB'))

        if self._engine == "rapidocr":
            results, elapse = self._rapidocr(img_array)
            parsed = self._parse_results(results)
            # elapse is a list of times for detection, classification, recognition
            if isinstance(elapse, list):
                total_time = sum(elapse)
            else:
                total_time = elapse
            logger.info(f"[RapidOCR] 识别到 {len(parsed)} 个文本块, 耗时 {total_time:.2f}s")
        else:
            results = self._paddleocr.ocr(img_array, cls=True)
            if results and results[0]:
                parsed = self._parse_results(results[0])
            else:
                parsed = []
            logger.info(f"[PaddleOCR] 识别到 {len(parsed)} 个文本块")

        return parsed
