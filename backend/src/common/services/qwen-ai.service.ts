import { Injectable, Logger } from '@nestjs/common';

export interface AiRecognizeResult {
  packageNo: number;
  pieceCount: number;
  netWeight: number;
  grade: string;
  productType: string;
  batchNo: string;
  inspector?: string;
  date: string;
}

@Injectable()
export class QwenAIService {
  private readonly logger = new Logger(QwenAIService.name);
  private readonly MAX_RETRIES = 2;
  private readonly TIMEOUT_MS = 120000;

  async recognizeImage(base64: string): Promise<AiRecognizeResult[]> {
    const prompt = `你是一个票据识别专家，专门识别镍板产品票据。请仔细分析这张图片中的表格数据。

## 识别要求

1. **牌号（grade）**：即图片中的"品级"字段，通常为 4 位数字，如 9996、9950、9999 等。请准确识别数字，不要遗漏或篡改。
2. **批号（batchNo）**：格式固定为"XX-X-XXX"模式，例如 26-7-090、26-12-005 等。请保持原始格式，不要转换。
3. **产品类型（productType）**：识别图片左上角"品名"右侧的文字，通常为"镍板"或"电积镍"等。
4. **包号（packageNo）**：表格中的序号/包号列，通常为数字。
5. **片数（pieceCount）**：每包对应的片数。
6. **净重（netWeight）**：每包的净重量，单位为**千克（kg）**。
7. **检验员（inspector）**：识别检验人员姓名，如无则设为 null。
8. **日期（date）**：识别票据上的日期，格式统一为 YYYY-MM-DD。

## 注意事项

- 提取表格中的**所有数据行**，排除合计行/汇总行/小计行
- 所有行的 productType 应为同一个值（同一张票据的产品类型一致）
- 牌号和批号是关键字段，请仔细核对，确保准确
- 如果某个字段无法识别或模糊不清，设为 null，不要猜测
- 净重可能是小数，请保留原始精度，单位统一使用**千克**
- 单包镍板重量通常在 500~5000 kg 范围，如果识别到的数值超过 10000 kg，请仔细核验是否多读了小数点
- 置信度要求：只返回你有把握识别的行，如果某行数据模糊无法确认，请跳过该行

请返回一个 JSON 数组，每个对象包含以下字段：
- packageNo: 包号（数字，无法识别则为 0）
- pieceCount: 片数（数字，无法识别则为 0）
- netWeight: 净重（数字，单位：千克，无法识别则为 0）
- grade: 牌号（字符串，如"9996"、"9950"，无法识别则为 ""）
- productType: 产品类型（字符串，如"镍板"，无法识别则为 ""）
- batchNo: 批号（字符串，格式如"26-7-090"，无法识别则为 ""）
- inspector: 检验员（字符串或 null）
- date: 日期（字符串，格式 YYYY-MM-DD，无法识别则为 ""）

只返回 JSON 数组，不要其他文字说明。不要用 markdown 代码块包裹。`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.callAPI(prompt, base64);
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

  private async callAPI(prompt: string, base64: string): Promise<AiRecognizeResult[]> {
    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-vl-plus',
          temperature: 0.1,
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
    // Try to extract JSON array from response
    let jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
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
   */
  crossValidate(items: AiRecognizeResult[]): { results: AiRecognizeResult[]; warnings: string[] } {
    const warnings: string[] = [];
    const results = items.map((item, i) => {
      const r = { ...item };
      const label = `第${i + 1}行（包号${r.packageNo || '-'}）`;

      // 1. 重量范围校验：单包镍板重量范围 500~5000 kg
      if (r.netWeight > 10000) {
        warnings.push(`${label} 净重 ${r.netWeight}kg 超过 10 吨（10000kg），请人工确认`);
      } else if (r.netWeight <= 0) {
        warnings.push(`${label} 净重为 0 或负值，请人工确认`);
      }

      // 2. 片数合理性
      if (r.pieceCount < 0) {
        warnings.push(`${label} 片数为负值，已纠正为 0`);
        r.pieceCount = 0;
      }

      // 3. 品级格式校验
      const gradeMatch = r.grade && /^(9999|9997|9996|9950|9920|99)$/.test(r.grade);
      if (r.grade && !gradeMatch) {
        warnings.push(`${label} 品级 "${r.grade}" 不在常见品级列表中，请人工确认`);
      }

      // 4. 批号格式校验
      if (r.batchNo && !/^\d{2}-\d{1,2}-\d{3}$/.test(r.batchNo)) {
        warnings.push(`${label} 批号 "${r.batchNo}" 格式异常（预期 XX-X-XXX）`);
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
    }

    const grade = String(item.grade || '').trim();

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

    // 单位纠正：AI 现在返回 kg，正常单包 500~5000 kg
    // < 10 kg 说明 AI 可能误将千克输出为吨（如 2→2000kg）
    if (netWeight > 0 && netWeight < 10) {
      this.logger.warn(`normalizeResult: netWeight=${netWeight} < 10kg, assuming AI output in tons, ×1000 → ${netWeight * 1000}`);
      netWeight = netWeight * 1000;
    }

    return {
      packageNo: Number(item.packageNo) || 0,
      pieceCount: Number(item.pieceCount) || 0,
      netWeight,
      grade,
      productType: String(item.productType || '').trim() || null as any,
      batchNo,
      inspector: item.inspector ? String(item.inspector).trim() : undefined,
      date,
    };
  }
}
