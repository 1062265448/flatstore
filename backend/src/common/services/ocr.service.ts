import { Injectable, Logger } from '@nestjs/common';
import { QwenAIService, AiModelType, AiRecognizeResult } from './qwen-ai.service';

/** OCR 服务返回的单行数据结构 */
interface OcrRowResult {
  packageNo?: string | number | null;
  pieceCount?: number;
  netWeight?: number;
  grade?: string;
  productType?: string | null;
  batchNo?: string;
  date?: string;
  specification?: string | null;
}

/** OCR 服务完整响应 */
interface OcrServiceResponse {
  success: boolean;
  results: OcrRowResult[];
  warnings: string[];
  confidence?: number;
  error?: string;
}

/** 最终返回给 distribution.service 的统一格式 */
export interface OcrRecognizeResult {
  results: AiRecognizeResult[];
  warnings: string[];
  source: 'ocr' | 'ai';
  confidence?: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8765';
  private readonly TIMEOUT_MS = 30000; // OCR 本地服务，30s 足够

  constructor(private qwenAI: QwenAIService) {}

  /**
   * 识别票据图片。
   * 优先走本地 OCR，失败自动 fallback 到 AI Vision。
   */
  async recognizeImage(
    base64: string,
    modelType: AiModelType = 'zhipu',
  ): Promise<OcrRecognizeResult> {
    // ── 尝试本地 OCR ──
    try {
      this.logger.log('调用本地 PaddleOCR 服务识别...');
      const ocrResult = await this.callOcrService(base64);

      if (ocrResult.success && ocrResult.results.length > 0) {
        // 复用 qwenAI 的 validate + crossValidate 逻辑
        const normalized = this.normalizeOcrResults(ocrResult.results);
        const validated = this.qwenAI.validateResults(normalized);
        const crossValidated = this.qwenAI.crossValidate(validated);

        this.logger.log(
          `PaddleOCR 识别成功: ${crossValidated.results.length} 行, 置信度 ${ocrResult.confidence?.toFixed(2)}`,
        );

        return {
          results: crossValidated.results,
          warnings: [...crossValidated.warnings, ...(ocrResult.warnings || [])],
          source: 'ocr',
          confidence: ocrResult.confidence,
        };
      }

      // OCR 返回了 success=false（低置信度、解析失败等）
      this.logger.warn(
        `PaddleOCR 识别未成功: ${ocrResult.error || '未知原因'}，降级到 AI Vision`,
      );
    } catch (err: any) {
      this.logger.warn(`PaddleOCR 调用失败 (${err?.message})，降级到 AI Vision`);
    }

    // ── Fallback 到 AI Vision ──
    this.logger.log('降级到 AI Vision 识别...');
    try {
      const aiResults = await this.qwenAI.recognizeImage(base64, modelType);
      const validated = this.qwenAI.crossValidate(aiResults);

      return {
        results: validated.results,
        warnings: [...validated.warnings, 'OCR 识别失败，已使用 AI Vision 兜底'],
        source: 'ai',
      };
    } catch (aiErr: any) {
      // AI 也失败了，抛出增强后的错误
      throw this.qwenAI.enhanceError(aiErr);
    }
  }

  /**
   * 调用本地 OCR 服务
   */
  private async callOcrService(base64: string): Promise<OcrServiceResponse> {
    const response = await fetch(`${this.OCR_URL}/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
      signal: AbortSignal.timeout(this.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`OCR 服务 HTTP ${response.status}`);
    }

    const data: OcrServiceResponse = await response.json();
    return data;
  }

  /**
   * 规范化 OCR 返回结果，使其与 AiRecognizeResult 类型一致。
   * OCR 服务的字段可能是 null/undefined，这里统一处理。
   */
  private normalizeOcrResults(items: OcrRowResult[]): AiRecognizeResult[] {
    return items.map((item) => {
      // packageNo: 字符串转数字（如果是纯数字）
      let packageNo: string | number = item.packageNo ?? '';
      if (typeof packageNo === 'string') {
        const trimmed = packageNo.trim();
        if (/^\d+$/.test(trimmed)) {
          packageNo = parseInt(trimmed, 10);
        } else if (trimmed) {
          packageNo = trimmed;
        }
      }

      // grade: 取最后 4 位数字
      const grade = String(item.grade || '').trim().replace(/.*?(\d{4})$/, '$1');

      // batchNo: 标准化
      let batchNo = String(item.batchNo || '').trim().replace(/\s+/g, '');
      batchNo = batchNo.replace(/([0-9])([ST])$/, (_, prefix, letter) => prefix + letter.toLowerCase());

      // date: YYYY-MM-DD
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

      // netWeight
      let netWeight = Number(item.netWeight) || 0;
      if (netWeight > 0 && netWeight < 1) {
        this.logger.warn(`OCR netWeight=${netWeight} < 1kg, ×1000 → ${netWeight * 1000}`);
        netWeight = netWeight * 1000;
      }

      // specification
      let specification = String(item.specification || '').trim();
      if (specification) {
        specification = specification.replace(/\*/g, '×').replace(/x/gi, '×');
      }

      return {
        packageNo,
        pieceCount: Number(item.pieceCount) || 0,
        netWeight,
        grade,
        productType: String(item.productType || '').trim() || (null as any),
        batchNo,
        date,
        specification: specification || undefined,
      };
    });
  }

  /**
   * 单独检查 OCR 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.OCR_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
}
