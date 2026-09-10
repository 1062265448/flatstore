/** 库存相关的纯函数工具 */

/** 是否为小规格块镍（小规格的片数不计入配货统计） */
export function isSmallBlockSpec(specification?: string | null): boolean {
  return !!specification && !['整板', '镍条'].includes(specification)
}

/** 统一产品类型名称（电积镍板 → 电积镍） */
export function normalizeProductType(productType?: string | null): string {
  const pt = productType || '-'
  return pt === '电积镍板' ? '电积镍' : pt
}

/** 品级排序：9997 > 9996 > 9950 > 9920 */
export function sortGrades(grades: string[]): string[] {
  const order = ['9997', '9996', '9950', '9920']
  return [...grades].sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

/** 包号为区间格式（如 "1-20"）表示小块镍片，片数不计入统计 */
export const RANGE_PACKAGE_NO_PATTERN = /^\d+\s*[-–—]\s*\d+$/

export function isRangePackageNo(packageNo?: unknown): boolean {
  return typeof packageNo === 'string' && RANGE_PACKAGE_NO_PATTERN.test(packageNo)
}
