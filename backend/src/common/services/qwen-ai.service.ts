import { Injectable, Logger } from '@nestjs/common';

export interface AiRecognizeResult {
  packageNo: string | number;
  pieceCount: number;
  netWeight: number;
  grade: string;
  productType: string;
  batchNo: string;
  date: string;
  specification?: string;
}

export type AiModelType = 'zhipu' | 'doubao';

interface ModelConfig {
  url: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

@Injectable()
export class QwenAIService {
  private readonly logger = new Logger(QwenAIService.name);
  private readonly MAX_RETRIES = 2;
  private readonly TIMEOUT_MS = 120000;

  private readonly modelConfigs: Record<AiModelType, ModelConfig> = {
    zhipu: {
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      apiKey: process.env.ZHIPU_API_KEY || '',
      model: 'glm-4.6v-flash',
      maxTokens: 4096,
    },
    doubao: {
      url: process.env.DOUBAO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      apiKey: process.env.DOUBAO_API_KEY || '',
      model: 'ep-m-20260517194750-n7m9d',
      maxTokens: 4096,
    },
  };

  async recognizeImage(base64: string, modelType: AiModelType = 'zhipu'): Promise<AiRecognizeResult[]> {
    const prompt = `识别镍板票据表格，提取每包数据行(排除合计/小计行)。注意：区分"净重"和"净重小计"列，只取单包净重。

票据有两种类型：
1. 整板票据：每行一包，包号、片数、净重逐一列出，单包净重通常1000~2500kg
2. 小块镍计量单：箱号列可能是范围(如1-40)，保留范围值作为packageNo；净重是每行对应的净重(可能是小计)；片数不填，设为0

返回JSON数组，每个对象：
{"packageNo":"","pieceCount":0,"netWeight":0,"grade":"","productType":"","batchNo":"","date":"","specification":""}

字段说明：
- packageNo: 包号/箱号，范围值原样保留(如"1-40")，非范围值填数字
- grade: 品级，4位数字如9997/9996/9950
- batchNo: 批号，格式XX-X-XXX，末尾字母仅J/s/t
- productType: 品名，如"电解镍""电积镍"
- pieceCount: 片数，小块镍票据填0
- netWeight: 净重(kg)
- date: 计量时间，格式YYYY-MM-DD
- specification: 规格，整板票据填"整板"，小块镍票据填尺寸如"100×100""50×50""25×25"，镍条填"镍条"

无需返回inspector字段。无法识别的字段按默认值返回。只返回JSON数组，不要markdown代码块或其他文字。`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.callAPI(prompt, base64, modelType);
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode;

        // Don't retry on client errors (4xx except 429)
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw this.enhanceError(err);
        }

        // Retry on 5xx or 429 (rate limit) or network errors
        if (attempt < this.MAX_RETRIES) {
          const delay = status === 429 ? 3000 * (attempt + 1) : 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }

    throw this.enhanceError(lastError!);
  }

  private async callAPI(prompt: string, base64: string, modelType: AiModelType): Promise<AiRecognizeResult[]> {
    const config = this.modelConfigs[modelType];
    if (!config.apiKey) {
      throw new Error(`AI 模型 ${modelType} 未配置 API Key`);
    }

    const response = await fetch(
      config.url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.1,
          max_tokens: config.maxTokens,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      },
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      const err: any = new Error(result.error?.message || `AI API 错误: ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const content = result.choices?.[0]?.message?.content || '';
    const items = this.parseResponse(content);
    return this.validateResults(items);
  }

  private parseResponse(content: string): AiRecognizeResult[] {
    // Strip markdown code block wrappers (e.g. ```json ... ```)
    let cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/,'').trim();

    // Try to extract JSON array from response
    let jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // No closing bracket — likely truncated. Try to complete the array.
      const openIdx = cleaned.indexOf('[');
      if (openIdx !== -1) {
        const partial = cleaned.substring(openIdx);
        const completed = this.tryFixTruncatedJSON(partial);
        if (completed) {
          try {
            const items = JSON.parse(completed);
            return items.map((item: any) => this.normalizeResult(item));
          } catch { /* fall through */ }
        }
      }
      try {
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        return items.map((item: any) => this.normalizeResult(item));
      } catch {
        throw new Error(`AI 返回结果无法解析: ${content.substring(0, 200)}`);
      }
    }

    try {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: any) => this.normalizeResult(item));
    } catch {
      throw new Error(`JSON 解析失败: ${jsonMatch[0].substring(0, 200)}`);
    }
  }

  private tryFixTruncatedJSON(partial: string): string | null {
    // Count open brackets/braces to determine how many are unclosed
    let openBrackets = 0, openBraces = 0;
    let inString = false, escape = false;
    for (const ch of partial) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
    }
    if (openBrackets < 0 || openBraces < 0) return null;
    // Close the last incomplete object first, then the array
    let fixed = partial.trimEnd();
    // Remove trailing comma or partial key/value
    fixed = fixed.replace(/,\s*$/, '');
    // Remove trailing partial token (incomplete string/value after colon)
    fixed = fixed.replace(/:\s*"[^"]*$/, ': null');
    fixed = fixed.replace(/:\s*[^,}\]]+$/, '');
    while (openBraces > 0) { fixed += '}'; openBraces--; }
    while (openBrackets > 0) { fixed += ']'; openBrackets--; }
    return fixed;
  }

  private validateResults(items: AiRecognizeResult[]): AiRecognizeResult[] {
    // Filter out items missing critical fields
    const valid = items.filter(
      (item) => item.batchNo && item.grade && item.batchNo.trim() !== '' && item.grade.trim() !== '',
    );

    if (valid.length === 0 && items.length > 0) {
      throw new Error('AI 识别结果缺少关键字段（批号或牌号），请上传更清晰的图片');
    }

    return valid.length > 0 ? valid : items;
  }

  /**
   * 交叉校验：对 AI 结果进行统计合理性检查
   * 返回经过纠错的结果和警告信息列表
   *
   * 整板单包重量合理范围：1000~2500 kg
   * - 超过 2500：可能误将小计/合计识别为单包净重，尝试自动校正
   * - 低于 1000：可能误读小数点或识别为残次品，发出警告
   */
  crossValidate(items: AiRecognizeResult[]): { results: AiRecognizeResult[]; warnings: string[] } {
    const warnings: string[] = [];
    const SINGLE_PKG_MIN = 1000;
    const SINGLE_PKG_MAX = 2500;
    const SMALL_BLOCK_MAX_PER_BOX = 50;
    const totalCount = items.length;

    // 判断是否为小块镍：packageNo 为范围字符串（如 "1-40"）
    const rangePattern = /^\d+\s*[-–—]\s*\d+$/;
    const isSmallBlock = items.some(r => typeof r.packageNo === 'string' && rangePattern.test(r.packageNo));

    const results = items.map((item, i) => {
      const r = { ...item };
      const label = `第${i + 1}行（包号${r.packageNo || '-'}）`;

      if (isSmallBlock) {
        // 小块镍校验：单行净重通常为小计（范围箱号对应），合理范围 100~5000 kg
        const isRangeRow = typeof r.packageNo === 'string' && rangePattern.test(r.packageNo);
        if (isRangeRow) {
          // 范围行：净重是箱组小计，合理性较宽
          if (r.netWeight <= 0) {
            warnings.push(`${label} 净重为 0 或负值，请人工确认`);
          }
        } else {
          // 非范围行（单箱）：单箱 10~50 kg
          if (r.netWeight > SMALL_BLOCK_MAX_PER_BOX) {
            warnings.push(`${label} 净重 ${r.netWeight}kg 超出小块镍单箱上限 ${SMALL_BLOCK_MAX_PER_BOX}kg，请人工复核`);
          } else if (r.netWeight <= 0) {
            warnings.push(`${label} 净重为 0 或负值，请人工确认`);
          }
        }
      } else {
        // 整板校验：1000~2500 kg
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

      // 2. 片数合理性
      if (isSmallBlock) {
        // 小块镍不统计片数
        r.pieceCount = 0;
      } else if (r.pieceCount < 0) {
        warnings.push(`${label} 片数为负值，已纠正为 0`);
        r.pieceCount = 0;
      }

      // 3. 品级格式校验
      const gradeMatch = r.grade && /^(9997|9996|9950|9920)$/.test(r.grade);
      if (r.grade && !gradeMatch) {
        warnings.push(`${label} 品级 "${r.grade}" 不在常见品级列表中，请人工确认`);
      }

      // 4. 批号格式校验（宽松：允许字母数字混合的段，末尾可带J/s/t）
      if (r.batchNo && !/^\d{2}-\d{1,2}-[A-Za-z0-9]{3,4}[Jst]?$/.test(r.batchNo)) {
        warnings.push(`${label} 批号 "${r.batchNo}" 格式异常，请人工确认`);
      }

      return r;
    });

    // 5. 同批次品级一致性检查
    if (results.length > 1) {
      const grades = [...new Set(results.map(r => r.grade).filter(Boolean))];
      if (grades.length > 1) {
        warnings.push(`同一票据出现多个品级 [${grades.join(', ')}]，请确认是否为混批`);
      }
    }

    // 6. 全局小计/合计行检测（仅整板票据）
    if (!isSmallBlock && results.length > 1) {
      const sumWeight = results.reduce((s, r) => s + r.netWeight, 0);
      const avgWeight = sumWeight / results.length;
      // 如果某包的净重 ≈ 所有包净重之和（误差 <2%），说明这是合计行误入
      for (const r of results) {
        if (r.netWeight > SINGLE_PKG_MAX && Math.abs(r.netWeight - sumWeight) / sumWeight < 0.02) {
          warnings.push(`包号${r.packageNo}的净重 ${r.netWeight}kg ≈ 全部包净重合计 ${sumWeight.toFixed(1)}kg，高度疑似合计行被误识别为数据行，建议删除该行`);
        }
      }
    }

    return { results, warnings };
  }

  private enhanceError(err: Error): Error {
    const status = (err as any).status || (err as any).statusCode;
    if (status === 429) {
      return new Error('AI 服务请求过于频繁，请稍后再试');
    }
    if (status === 400) {
      return new Error('图片格式不支持或内容无法识别，请检查图片');
    }
    if (err.message?.includes('timeout') || err.name === 'TimeoutError') {
      return new Error('AI 识别超时，请尝试更小的图片或稍后重试');
    }
    return err;
  }

  /**
   * 规范化 AI 识别结果
   * - 批号固定为 XX-X-XXX 格式
   * - 牌号保留原始字符串
   * - 日期统一为 YYYY-MM-DD
   */
  private normalizeResult(item: any): AiRecognizeResult {
    let batchNo = String(item.batchNo || '').trim();
    if (batchNo) {
      batchNo = batchNo.replace(/\s+/g, '');
      // 批号末尾字母纠正：J 保持大写，S/T 自动转小写
      batchNo = batchNo.replace(/([0-9])([ST])$/, (_, prefix, letter) => prefix + letter.toLowerCase());
    }

    const grade = String(item.grade || '').trim().replace(/.*?(\d{4})$/, '$1');

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

    // 单位纠正：AI 可能误将千克输出为吨（如 2→2000kg）
    // 仅对极小值(< 10)且看起来像整板重量级的数据做 ×1000 纠正
    // 注意：小块镍净重 10~50kg 不应被放大
    if (netWeight > 0 && netWeight < 1) {
      this.logger.warn(`normalizeResult: netWeight=${netWeight} < 1kg, assuming AI output in tons, ×1000 → ${netWeight * 1000}`);
      netWeight = netWeight * 1000;
    }

    // packageNo: 保留原始值（范围如"1-40"保持字符串，数字保持数字）
    let packageNo: string | number = item.packageNo;
    if (typeof packageNo === 'string') {
      const trimmed = packageNo.trim();
      // 如果是纯数字字符串，转为数字
      if (/^\d+$/.test(trimmed)) {
        packageNo = parseInt(trimmed, 10);
      } else {
        // 范围值或其他字符串原样保留
        packageNo = trimmed;
      }
    }

    // specification: 规范化格式，统一用 ×
    let specification = String(item.specification || '').trim();
    if (specification) {
      // AI 可能返回 100*100、100x100 等变体，统一为 100×100
      specification = specification.replace(/\*/g, '×').replace(/x/gi, '×');
    }

    return {
      packageNo,
      pieceCount: Number(item.pieceCount) || 0,
      netWeight,
      grade,
      productType: String(item.productType || '').trim() || null as any,
      batchNo,
      date,
      specification: specification || undefined,
    };
  }
}
