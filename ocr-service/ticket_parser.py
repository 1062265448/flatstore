"""
票据解析器 — 基于 OCR 文字 + 位置信息重建表格结构。

两种票据类型：
1. 整板票据：每行一包，包号/片数/净重逐一列出，单包净重 1000~2500kg
2. 小块镍计量单：箱号可能是范围(如1-40)，净重是每行对应净重

解析策略：
- 用 Y 坐标聚类成行
- 用 X 坐标推断列归属（优先选列数最多的表头行）
- 用正则和上下文提取字段
"""

import re
import logging
from datetime import datetime as _datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ─── 正则 ───────────────────────────────────────────────────────────────

BATCH_NO_RE = re.compile(r'\d{2}-\d{1,2}-[A-Za-z0-9]{3,4}[Jst]?')
NUMBER_RE = re.compile(r'^[\d.,]+$')
PACKAGE_NO_RE = re.compile(r'^\d+\s*[-–—]\s*\d+$')  # 范围如 41-80
DATE_RE = re.compile(r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?')

# 品级正则（支持 Ni9997 / 9997）
GRADE_RE = re.compile(r'(?:Ni|NI|ni)?(9997|9996|9950|9920)')

# 列关键词
COL_KEYWORDS = {
    'packageNo': ['包号', '件号', '编号', '序号', '箱号', '捆号', '排号'],
    'pieceCount': ['片数', '张数', '块数', '数量'],
    'netWeight': ['净重', '重量'],
    'grade': ['品级', '牌号', '等级'],
    'batchNo': ['批号', '炉号', '批次'],
    'productType': ['品名', '名称', '产品名称'],
    'date': ['日期', '时间', '计量时间', '生产日'],
    'specification': ['规格', '尺寸'],
}

# 品名关键词（仅电解镍 / 电积镍）
PRODUCT_TYPE_KEYWORDS = {
    '电解镍': ['电解镍'],
    '电积镍': ['电积镍'],
}

# 规格关键词（镍板 / 镍条等物理形态）
SPEC_KEYWORDS = {
    '镍板': ['镍板'],
    '镍条': ['镍条'],
    '镍包': ['镍包'],
}

# 规格正则
SPEC_SIZE_RE = re.compile(r'(\d+)\s*[,xX×*]\s*(\d+)')

# 合计/小计关键词（用于过滤）
SUMMARY_KEYWORDS = ['合计', '小计', '总计', '汇总']


@dataclass
class RowGroup:
    """一行 OCR 结果（同一 Y 坐标区间的文本块）"""
    items: List[Dict[str, Any]] = field(default_factory=list)
    y_center: float = 0.0

    @property
    def full_text(self) -> str:
        """按 X 排序拼接文本"""
        sorted_items = sorted(self.items, key=lambda x: x['center_x'])
        return ' '.join(item['text'] for item in sorted_items)

    @property
    def x_sorted(self) -> List[Dict[str, Any]]:
        return sorted(self.items, key=lambda x: x['center_x'])


def cluster_rows(ocr_results: List[Dict[str, Any]], y_threshold: float = 25) -> List[RowGroup]:
    """按 Y 坐标将 OCR 结果聚类成行"""
    if not ocr_results:
        return []

    sorted_results = sorted(ocr_results, key=lambda x: x['center_y'])

    rows: List[RowGroup] = []
    current_row = RowGroup()
    current_row.items.append(sorted_results[0])
    current_row.y_center = sorted_results[0]['center_y']

    for item in sorted_results[1:]:
        if abs(item['center_y'] - current_row.y_center) <= y_threshold:
            current_row.items.append(item)
        else:
            rows.append(current_row)
            current_row = RowGroup()
            current_row.items.append(item)
            current_row.y_center = item['center_y']

    if current_row.items:
        rows.append(current_row)

    logger.debug(f"OCR 结果聚类为 {len(rows)} 行")
    return rows


def classify_row_text(text: str) -> Optional[str]:
    """根据文本内容推测其属于哪种字段类型"""
    text = text.strip()

    # 批号
    if BATCH_NO_RE.match(text):
        return 'batchNo'

    # 品级
    if GRADE_RE.search(text):
        return 'grade'

    # 净重（纯数字，可能是小数）
    if NUMBER_RE.match(text):
        try:
            val = float(text.replace(',', ''))
            if 0 < val < 10000:
                return 'netWeight_candidate'
        except ValueError:
            pass

    # 包号范围
    if PACKAGE_NO_RE.match(text):
        return 'packageNo'

    # 纯数字（可能是包号或片数）
    if text.isdigit():
        return 'number_candidate'

    # 日期
    if DATE_RE.search(text):
        return 'date'

    return None


def is_summary_row(text: str) -> bool:
    """检查是否为合计/小计行"""
    for kw in SUMMARY_KEYWORDS:
        if kw in text:
            return True
    return False


def extract_date(text: str) -> Optional[str]:
    """从文本中提取日期，统一为 YYYY-MM-DD"""
    m = DATE_RE.search(text)
    if not m:
        return None

    date_str = m.group(0)
    date_str = date_str.replace('年', '-').replace('月', '-').replace('日', '').replace('号', '')
    date_str = date_str.replace('/', '-')

    parts = date_str.split('-')
    if len(parts) == 3:
        y, mo, d = parts
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"

    return date_str


def parse_ticket(ocr_results: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """解析票据 OCR 结果，返回结构化数据和警告信息"""
    warnings: List[str] = []

    if not ocr_results:
        return [], ['OCR 结果为空']

    # 检查整体置信度（使用 CONFIDENCE_THRESHOLD 环境变量，默认 0.5）
    import os
    threshold = float(os.environ.get("OCR_CONFIDENCE_THRESHOLD", "0.5"))
    avg_confidence = sum(r['confidence'] for r in ocr_results) / len(ocr_results)
    if avg_confidence < threshold:
        return [], [f'OCR 平均置信度过低 ({avg_confidence:.2f})']

    # 步骤 1: 聚类成行
    rows = cluster_rows(ocr_results)
    if not rows:
        return [], ['无法从 OCR 结果中识别行结构']

    # 步骤 2: 识别列头行（选列数最多的行）
    col_map, header_row_idx = detect_columns(rows)

    # 步骤 3: 提取全局信息
    global_info = extract_global_info(ocr_results, rows)

    # 步骤 4: 提取数据行
    data_rows = extract_data_rows(rows, col_map, global_info, header_row_idx)

    if not data_rows:
        return [], ['未能从票据中提取到有效数据行']

    # 步骤 5: 标准化结果
    results = normalize_results(data_rows, global_info, warnings)

    return results, warnings


def detect_columns(rows: List[RowGroup]) -> Tuple[Dict[str, list], int]:
    """
    检测列头行，建立列名→X 坐标区间的映射。
    选择列数最多的表头行（避免标题行被误选）。
    返回 (col_map, header_row_idx)
    """
    best_row_idx = -1
    best_cols: Dict[str, Tuple[int, int]] = {}

    for i, row in enumerate(rows[:5]):
        text = row.full_text
        found_cols: Dict[str, Tuple[int, int]] = {}

        for col_name, keywords in COL_KEYWORDS.items():
            for kw in keywords:
                if kw in text:
                    for item in row.x_sorted:
                        if kw in item['text']:
                            found_cols[col_name] = (item['x_min'], item['x_max'])
                            break

        if len(found_cols) > len(best_cols):
            best_row_idx = i
            best_cols = found_cols

    if len(best_cols) >= 2:
        logger.info(f"检测到表头行（第 {best_row_idx+1} 行）: {list(best_cols.keys())}")
        return {k: list(v) for k, v in best_cols.items()}, best_row_idx

    logger.info("未检测到表头行，将使用启发式解析")
    return {}, -1


def extract_global_info(ocr_results: List[Dict[str, Any]], rows: List[RowGroup]) -> Dict[str, Any]:
    """从整个 OCR 结果中提取全局信息：批号、品级、品名、日期等"""
    info: Dict[str, Any] = {
        'batchNo': '',
        'grade': '',
        'productType': '',
        'date': '',
        'specification': '',
    }

    for item in ocr_results:
        text = item['text'].strip()

        # 批号
        if not info['batchNo']:
            m = BATCH_NO_RE.search(text)
            if m:
                info['batchNo'] = m.group(0)

        # 品级 (支持 Ni9997 / 9997)
        if not info['grade']:
            grade_match = GRADE_RE.search(text)
            if grade_match:
                info['grade'] = grade_match.group(1)

        # 日期
        if not info['date']:
            d = extract_date(text)
            if d:
                info['date'] = d

    # 品名
    full_text = ' '.join(item['text'] for item in ocr_results)
    for product_type, keywords in PRODUCT_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in full_text:
                info['productType'] = product_type
                break
        if info['productType']:
            break

    # 规格：尺寸模式（如 50*50 / 100×100）
    if '整板' in full_text:
        info['specification'] = '整板'
    else:
        # 先检查规格关键词（镍板/镍条/镍包）
        for spec_kw, keywords in SPEC_KEYWORDS.items():
            for kw in keywords:
                if kw in full_text:
                    info['specification'] = spec_kw
                    break
            if info['specification']:
                break
        # 再检查尺寸模式
        if not info['specification']:
            m = SPEC_SIZE_RE.search(full_text)
            if m:
                info['specification'] = f"{m.group(1)}×{m.group(2)}"

    return info


def extract_data_rows(
    rows: List[RowGroup],
    col_map: Dict[str, list],
    global_info: Dict[str, Any],
    header_row_idx: int = -1,
) -> List[Dict[str, Any]]:
    """从行数据中提取每包/每行的结构化数据"""
    data_rows: List[Dict[str, Any]] = []

    # 数据起始行：表头行的下一行
    data_start = header_row_idx + 1 if header_row_idx >= 0 else 0

    # 处理数据行
    for i in range(data_start, len(rows)):
        row = rows[i]
        text = row.full_text

        # 过滤合计/小计行
        if is_summary_row(text):
            logger.debug(f"跳过合计行: {text[:50]}")
            continue

        # 过滤空白行
        if not text.strip():
            continue

        row_data = parse_row_heuristic(row.x_sorted, col_map, global_info)

        if row_data:
            data_rows.append(row_data)

    return data_rows


def parse_row_heuristic(
    items: List[Dict[str, Any]],
    col_map: Dict[str, list],
    global_info: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """启发式解析单行数据，遍历该行所有文本块"""
    row_data: Dict[str, Any] = {
        'packageNo': '',
        'pieceCount': 0,
        'netWeight': 0,
        'grade': '',
        'productType': '',
        'batchNo': '',
        'date': '',
        'specification': '',
    }

    if col_map:
        return parse_row_with_colmap(items, col_map, global_info, row_data)

    return parse_row_no_colmap_all(items, global_info, row_data)


def parse_row_with_colmap(
    items: List[Dict[str, Any]],
    col_map: Dict[str, list],
    global_info: Dict[str, Any],
    row_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """使用列映射解析行数据"""
    found_any = False

    for item in items:
        text = item['text'].strip()
        if not text:
            continue
        cx = item['center_x']

        # 先尝试匹配列区间
        matched_col = False
        for col_name, [x_min, x_max] in col_map.items():
            if x_min - 30 <= cx <= x_max + 30:
                found_any = True
                matched_col = True
                assign_field(row_data, col_name, text, global_info)
                break

        # 不在任何列区间内，尝试启发式分类
        if not matched_col:
            classify = classify_row_text(text)
            if classify:
                found_any = True
                assign_field(row_data, classify, text, global_info)

    if not found_any:
        return None

    return row_data


def parse_row_no_colmap_all(
    items: List[Dict[str, Any]],
    global_info: Dict[str, Any],
    row_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """无列映射时的启发式解析 — 遍历所有文本块，为每行提取所有可能的字段"""
    found_any = False

    for item in items:
        text = item['text'].strip()
        if not text:
            continue

        classify = classify_row_text(text)
        if classify:
            found_any = True
            assign_field(row_data, classify, text, global_info)
        else:
            # 尝试匹配品名关键字
            text_lower = text.lower()
            for pt in ['电解镍', '电积镍']:
                if pt in text_lower:
                    row_data['productType'] = pt
                    found_any = True
                    break
            # 尝试匹配规格关键词
            if not row_data.get('specification'):
                for spec_kw in ['镍板', '镍条', '镍包']:
                    if spec_kw in text_lower:
                        row_data['specification'] = spec_kw
                        found_any = True
                        break

    if not found_any:
        return None

    return row_data


def assign_field(
    row_data: Dict[str, Any],
    field_type: str,
    text: str,
    global_info: Dict[str, Any],
):
    """将文本值分配到对应字段"""
    if field_type == 'batchNo':
        m = BATCH_NO_RE.search(text)
        if m:
            row_data['batchNo'] = m.group(0)

    elif field_type == 'grade':
        grade_match = GRADE_RE.search(text)
        if grade_match:
            row_data['grade'] = grade_match.group(1)

    elif field_type == 'netWeight_candidate':
        try:
            val = float(text.replace(',', ''))
            if val > 0:
                row_data['netWeight'] = val
        except ValueError:
            pass

    elif field_type == 'packageNo':
        if PACKAGE_NO_RE.match(text):
            row_data['packageNo'] = text
        elif text.isdigit():
            row_data['packageNo'] = int(text)

    elif field_type == 'number_candidate':
        try:
            val = int(text)
            if val == 0:
                pass
            elif val >= 1000:
                row_data['netWeight'] = float(val)
            elif 25 <= val <= 45:
                # 片数合理范围：25-45
                if row_data['netWeight'] > 0:
                    row_data['pieceCount'] = val
                else:
                    row_data['packageNo'] = val
            else:
                if row_data['packageNo'] == '' or row_data['packageNo'] == 0:
                    row_data['packageNo'] = val
        except ValueError:
            pass

    elif field_type == 'date':
        d = extract_date(text)
        if d:
            row_data['date'] = d

    elif field_type == 'productType':
        for pt in ['电解镍', '电积镍']:
            if pt in text:
                row_data['productType'] = pt
                break


def normalize_results(
    data_rows: List[Dict[str, Any]],
    global_info: Dict[str, Any],
    warnings: List[str],
) -> List[Dict[str, Any]]:
    """标准化结果：填充全局信息、校验字段格式"""
    results: List[Dict[str, Any]] = []

    for i, row in enumerate(data_rows):
        # 填充全局信息
        for key in ['batchNo', 'grade', 'productType', 'date', 'specification']:
            if not row.get(key) and global_info.get(key):
                row[key] = global_info[key]

        # 批号格式标准化
        batch_no = str(row.get('batchNo', '')).strip()
        if batch_no:
            batch_no = batch_no.replace(' ', '')
            row['batchNo'] = batch_no

        # 品级提取
        grade = str(row.get('grade', '')).strip()
        if grade:
            m = re.search(r'(\d{4})$', grade)
            if m:
                row['grade'] = m.group(1)

        # 日期标准化
        date_str = str(row.get('date', '')).strip()
        if date_str:
            try:
                d = _datetime.strptime(date_str, '%Y-%m-%d')
                row['date'] = d.strftime('%Y-%m-%d')
            except ValueError:
                pass

        # 净重单位纠正
        net_weight = float(row.get('netWeight', 0) or 0)
        if 0 < net_weight < 1:
            net_weight *= 1000
            warnings.append(f"第{i+1}行净重 {net_weight/1000:.1f} 疑似吨单位，已纠正为 {net_weight:.0f}kg")
        row['netWeight'] = net_weight

        # packageNo 规范化
        pkg = row.get('packageNo', '')
        if isinstance(pkg, str):
            pkg = pkg.strip()
            if re.match(r'^\d+$', pkg):
                pkg = int(pkg)
        row['packageNo'] = pkg

        row['pieceCount'] = int(row.get('pieceCount', 0) or 0)

        # specification 规范化
        spec = str(row.get('specification', '')).strip()
        if spec:
            spec = spec.replace('*', '×').replace('x', '×').replace('X', '×')
        row['specification'] = spec

        row['productType'] = str(row.get('productType', '')).strip() or None

        results.append(row)

    return results