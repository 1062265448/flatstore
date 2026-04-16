import { Injectable } from '@nestjs/common';

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
  async recognizeImage(base64: string): Promise<AiRecognizeResult[]> {
    const prompt = `你是一个票据识别专家，专门识别镍板产品票据。请仔细分析这张图片中的表格数据。

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

只返回 JSON 数组，不要其他文字说明。`;

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
        signal: AbortSignal.timeout(120000),
      },
    );

    const result = await response.json();

    // 检查 API 调用是否成功
    if (!response.ok || result.error) {
      const errorMsg = result.error?.message || `AI API 错误: ${response.status}`;
      throw new Error(errorMsg);
    }

    // JSON 解析容错
    const content = result.choices?.[0]?.message?.content || '';

    // 尝试提取 JSON 数组
    let jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // AI 可能返回了其他格式，尝试直接解析 content
      try {
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        return items.map((item: any) => this.normalizeResult(item));
      } catch {
        throw new Error(`AI 返回结果无法解析: ${content.substring(0, 100)}`);
      }
    }

    try {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((item: any) => this.normalizeResult(item));
    } catch {
      throw new Error(`JSON 解析失败: ${jsonMatch[0].substring(0, 100)}`);
    }
  }

  /**
   * 规范化 AI 识别结果
   * - 批号固定为 XX-X-XXX 格式
   * - 牌号保留原始字符串
   * - 日期统一为 YYYY-MM-DD
   */
  private normalizeResult(item: any): AiRecognizeResult {
    // 批号标准化：确保格式为 XX-X-XXX
    let batchNo = String(item.batchNo || '').trim();
    if (batchNo) {
      // 如果 AI 返回的批号不带前缀数字，尝试补全
      // 例如 "7-090" → 如果图片中有 "26-7-090" 则保留完整
      // 这里只做简单格式化，不修改 AI 返回的核心内容
      batchNo = batchNo.replace(/\s+/g, ''); // 去除空格
    }

    // 牌号标准化：保留原始字符串，去除前后空格
    const grade = String(item.grade || '').trim();

    // 日期标准化
    let date = String(item.date || '').trim();
    if (date) {
      // 尝试解析各种日期格式
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
}
