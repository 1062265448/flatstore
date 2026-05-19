import { QwenAIService } from '../../src/common/services/qwen-ai.service';
import type { AiRecognizeResult } from 'src/common/services/qwen-ai.service';

const baseItem = (overrides: Partial<AiRecognizeResult> = {}): AiRecognizeResult => ({
  packageNo: 1, netWeight: 1482, pieceCount: 10, grade: '9996', productType: '电解镍', batchNo: '25-5-001', date: '', ...overrides,
});

describe('QwenAIService.crossValidate', () => {
  let service: QwenAIService;

  beforeEach(() => {
    service = new QwenAIService();
  });

  // --- 重量校验 ---

  it('should pass through normal weight (500~5000 kg)', () => {
    const items: AiRecognizeResult[] = [baseItem()];
    const { results, warnings } = service.crossValidate(items);
    expect(results[0].netWeight).toBe(1482);
    expect(warnings).toHaveLength(0);
  });

  it('should warn for oversized weight (> 10000 kg)', () => {
    const items: AiRecognizeResult[] = [baseItem({ netWeight: 15000 })];
    const { results, warnings } = service.crossValidate(items);
    expect(warnings[0]).toContain('超过');
    expect(warnings[0]).toContain('10000kg');
  });

  it('should warn for zero or negative weight', () => {
    const items: AiRecognizeResult[] = [baseItem({ netWeight: 0 })];
    const { results, warnings } = service.crossValidate(items);
    expect(warnings[0]).toContain('0');
  });

  // --- 片数校验 ---

  it('should correct negative pieceCount to 0', () => {
    const items: AiRecognizeResult[] = [baseItem({ pieceCount: -3 })];
    const { results, warnings } = service.crossValidate(items);
    expect(results[0].pieceCount).toBe(0);
    expect(warnings[0]).toContain('片数');
  });

  it('should accept valid pieceCount', () => {
    const items: AiRecognizeResult[] = [baseItem({ pieceCount: 8 })];
    const { results, warnings } = service.crossValidate(items);
    expect(results[0].pieceCount).toBe(8);
    expect(warnings).toHaveLength(0);
  });

  // --- 品级格式校验 ---

  it('should accept valid grade values', () => {
    const validGrades = ['9999', '9997', '9996', '9950', '9920', '99'];
    for (const grade of validGrades) {
      const items: AiRecognizeResult[] = [baseItem({ grade })];
      const { warnings } = service.crossValidate(items);
      const gradeWarnings = warnings.filter(w => w.includes('品级'));
      expect(gradeWarnings).toHaveLength(0);
    }
  });

  it('should warn for unknown grade values', () => {
    const items: AiRecognizeResult[] = [baseItem({ grade: '1234' })];
    const { results, warnings } = service.crossValidate(items);
    expect(results[0].grade).toBe('1234');
    expect(warnings[0]).toContain('品级');
  });

  // --- 批号格式校验 ---

  it('should accept valid batchNo format (XX-X-XXX)', () => {
    const items: AiRecognizeResult[] = [baseItem()];
    const { warnings } = service.crossValidate(items);
    const batchWarnings = warnings.filter(w => w.includes('批号'));
    expect(batchWarnings).toHaveLength(0);
  });

  it('should warn for invalid batchNo format', () => {
    const items: AiRecognizeResult[] = [baseItem({ batchNo: '25-005-001' })];
    const { warnings } = service.crossValidate(items);
    const batchWarnings = warnings.filter(w => w.includes('批号'));
    expect(batchWarnings.length).toBeGreaterThan(0);
  });

  // --- 多条目处理 ---

  it('should process multiple items and collect all warnings', () => {
    const items: AiRecognizeResult[] = [
      baseItem({ packageNo: 1 }),
      baseItem({ packageNo: 2, netWeight: 15000, pieceCount: 8, grade: '1234' }),
    ];
    const { results, warnings } = service.crossValidate(items);
    expect(results).toHaveLength(2);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });
});
