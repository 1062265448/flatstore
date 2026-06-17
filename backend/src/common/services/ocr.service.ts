import { Injectable, Logger, ServiceUnavailableException, BadGatewayException, BadRequestException } from '@nestjs/common';

/** 识别结果类型 */
export interface OcrRecognizeResult {
  packageNo: string | number;
  pieceCount: number;
  netWeight: number;
  grade: string;
  productType: string;
  batchNo: string;
  date: string;
  specification?: string;
}

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
export interface OcrRecognizeOutput {
  results: OcrRecognizeResult[];
  warnings: string[];
  confidence?: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly OCR_URL: string;
  private readonly TIMEOUT_MS = 30000;

  constructor() {
    this.OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8765';
  }

  /**
   * 识别票据图片 — 纯 OCR 识别。
   */
  async recognizeImage(base64: string): Promise<OcrRecognizeOutput> {
    const available = await this.isAvailable();
    if (!available) {
      this.logger.error('OCR 服务不可用，请检查 ocr-service 是否运行');
      throw new ServiceUnavailableException('OCR 服务不可用，请联系管理员');
    }

    this.logger.log('调用本地 OCR 服务识别...');

    const t0 = Date.now();
    const ocrResult = await this.callOcrService(base64);
    const elapsed = Date.now() - t0;
    this.logger.log(`OCR 服务响应耗时: ${elapsed}ms`);

    if (!ocrResult.success || ocrResult.results.length === 0) {
      const reason = ocrResult.error || 'OCR 返回空结果';
      this.logger.error(`OCR 识别失败: ${reason}`);
      throw new BadGatewayException(`OCR 识别失败: ${reason}`);
    }

    const normalized = this.normalizeOcrResults(ocrResult.results);
    const validated = this.validateResults(normalized);
    const crossValidated = this.crossValidate(validated);

    this.logger.log(
      `OCR 识别成功: ${crossValidated.results.length} 行, 置信度 ${ocrResult.confidence?.toFixed(2)}`,
    );

    return {
      results: crossValidated.results,
      warnings: [...crossValidated.warnings, ...(ocrResult.warnings || [])],
      confidence: ocrResult.confidence,
    };
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
      throw new BadGatewayException(`OCR 服务 HTTP ${response.status}`);
    }

    const data: OcrServiceResponse = await response.json();
    return data;
  }

  /**
   * 校验结果 — 过滤缺少关键字段的行
   */
  private validateResults(items: OcrRecognizeResult[]): OcrRecognizeResult[] {
    const valid = items.filter(
      (item) => item.batchNo && item.grade && item.batchNo.trim() !== '' && item.grade.trim() !== '',
    );

    if (valid.length === 0 && items.length > 0) {
      throw new BadRequestException('OCR 识别结果缺少关键字段（批号或牌号），请上传更清晰的图片');
    }

    return valid.length > 0 ? valid : items;
  }

  /**
   * 交叉校验：统计合理性检查
   */
  private crossValidate(items: OcrRecognizeResult[]): { results: OcrRecognizeResult[]; warnings: string[] } {
    const warnings: string[] = [];
    const SINGLE_PKG_MIN = 1000;
    const SINGLE_PKG_MAX = 2500;
    const SMALL_BLOCK_MAX_PER_BOX = 50;
    const totalCount = items.length;

    const rangePattern = /^\d+\s*[-–—]\s*\d+$/;
    const isSmallBlock = items.some(r => typeof r.packageNo === 'string' && rangePattern.test(r.packageNo));

    const results = items.map((item, i) => {
      const r = { ...item };
      const label = `第${i + 1}行（包号${r.packageNo || '-'}）`;

      if (isSmallBlock) {
        const isRangeRow = typeof r.packageNo === 'string' && rangePattern.test(r.packageNo);
        if (isRangeRow) {
          if (r.netWeight <= 0) {
            warnings.push(`${label} 净重为 0 或负值，请人工确认`);
          }
        } else {
          if (r.netWeight > SMALL_BLOCK_MAX_PER_BOX) {
            warnings.push(`${label} 净重 ${r.netWeight}kg 超出小块镍单箱上限 ${SMALL_BLOCK_MAX_PER_BOX}kg，请人工复核`);
          } else if (r.netWeight <= 0) {
            warnings.push(`${label} 净重为 0 或负值，请人工确认`);
          }
        }
      } else {
        if (r.netWeight > SINGLE_PKG_MAX) {
          if (totalCount > 1) {
            const avgWeight = r.netWeight / totalCount;
            if (avgWeight >= SINGLE_PKG_MIN && avgWeight <= SINGLE_PKG_MAX) {
              warnings.push(`${label} 净重 ${r.netWeight}kg 超出单包上限 ${SINGLE_PKG_MAX}kg，疑似将小计识别为单包净重，已自动校正为 ${avgWeight.toFixed(1)}kg`);
              r.netWeight = parseFloat(avgWeight.toFixed(1));
            } else {
              warnings.push(`${label} 净重 ${r.netWeight}kg 超出单包上限 ${SINGLE_PKG_MAX}kg，无法自动校正，请人工复核`);
            }
          } else {
            warnings.push(`${label} 净重 ${r.netWeight}kg 超出单包上限 ${SINGLE_PKG_MAX}kg，请人工复核`);
          }
        } else if (r.netWeight > 0 && r.netWeight < SINGLE_PKG_MIN) {
          if (r.netWeight < 10) {
            warnings.push(`${label} 净重 ${r.netWeight}kg 远低于单包下限 ${SINGLE_PKG_MIN}kg，可能存在单位错误，请人工复核`);
          } else {
            warnings.push(`${label} 净重 ${r.netWeight}kg 低于单包下限 ${SINGLE_PKG_MIN}kg，请确认是否为残次品或半包`);
          }
        } else if (r.netWeight <= 0) {
          warnings.push(`${label} 净重为 0 或负值，请人工确认`);
        }
      }

      // 片数合理性（25-45）
      if (isSmallBlock) {
        r.pieceCount = 0;
      } else if (r.pieceCount > 0 && (r.pieceCount < 25 || r.pieceCount > 45)) {
        warnings.push(`${label} 片数 ${r.pieceCount} 不在正常范围(25-45)内，请人工复核`);
      } else if (r.pieceCount < 0) {
        warnings.push(`${label} 片数为负值，已纠正为 0`);
        r.pieceCount = 0;
      }

      // 品级格式
      const gradeMatch = r.grade && /^(9997|9996|9950|9920)$/.test(r.grade);
      if (r.grade && !gradeMatch) {
        warnings.push(`${label} 品级 "${r.grade}" 不在常见品级列表中，请人工确认`);
      }

      // 批号格式
      if (r.batchNo && !/^\d{2}-\d{1,2}-[A-Za-z0-9]{3,4}[Jst]?$/.test(r.batchNo)) {
        warnings.push(`${label} 批号 "${r.batchNo}" 格式异常，请人工确认`);
      }

      return r;
    });

    // 同批次品级一致性
    if (results.length > 1) {
      const grades = [...new Set(results.map(r => r.grade).filter(Boolean))];
      if (grades.length > 1) {
        warnings.push(`同一票据出现多个品级 [${grades.join(', ')}]，请确认是否为混批`);
      }
    }

    // 合计行检测
    if (!isSmallBlock && results.length > 1) {
      const sumWeight = results.reduce((s, r) => s + r.netWeight, 0);
      for (const r of results) {
        if (r.netWeight > SINGLE_PKG_MAX && Math.abs(r.netWeight - sumWeight) / sumWeight < 0.02) {
          warnings.push(`包号${r.packageNo}的净重 ${r.netWeight}kg ≈ 全部包净重合计 ${sumWeight.toFixed(1)}kg，高度疑似合计行被误识别为数据行，建议删除该行`);
        }
      }
    }

    return { results, warnings };
  }

  /**
   * 规范化 OCR 返回结果
   */
  private normalizeOcrResults(items: OcrRowResult[]): OcrRecognizeResult[] {
    return items.map((item) => {
      let packageNo: string | number = item.packageNo ?? '';
      if (typeof packageNo === 'string') {
        const trimmed = packageNo.trim();
        if (/^\d+$/.test(trimmed)) {
          packageNo = parseInt(trimmed, 10);
        } else if (trimmed) {
          packageNo = trimmed;
        }
      }

      const grade = String(item.grade || '').trim().replace(/.*?(\d{4})$/, '$1');

      let batchNo = String(item.batchNo || '').trim().replace(/\s+/g, '');
      batchNo = batchNo.replace(/([0-9])([ST])$/, (_, prefix, letter) => prefix + letter.toLowerCase());

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

      let netWeight = Number(item.netWeight) || 0;
      if (netWeight > 0 && netWeight < 1) {
        this.logger.warn(`OCR netWeight=${netWeight} < 1kg, ×1000 → ${netWeight * 1000}`);
        netWeight = netWeight * 1000;
      }

      let specification = String(item.specification || '').trim();
      if (specification) {
        specification = specification.replace(/\*/g, '×').replace(/x/gi, '×');
      }

      return {
        packageNo,
        pieceCount: Number(item.pieceCount) || 0,
        netWeight,
        grade,
        productType: String(item.productType || '').trim() || '',
        batchNo,
        date,
        specification: specification || undefined,
      };
    });
  }

  /**
   * 探活检查
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.OCR_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'ok' && data.model_loaded === true;
    } catch {
      return false;
    }
  }
}
