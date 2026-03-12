/**
 * 금액을 한국 원화 형식으로 포맷
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

/**
 * 숫자를 천단위 구분 포맷
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

/**
 * 퍼센트 포맷 (소수점 2자리)
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * 등락률에 따른 색상 반환
 */
export function getPriceColor(change: number): string {
  if (change > 0) return '#ef4444'; // 빨강 (상승)
  if (change < 0) return '#3b82f6'; // 파랑 (하락)
  return '#6b7280'; // 회색 (보합)
}

/**
 * 날짜 포맷 (YYYYMMDD → YYYY.MM.DD)
 */
export function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}

/**
 * 시간 포맷 (HHMMSS → HH:MM:SS)
 */
export function formatTime(timeStr: string): string {
  if (timeStr.length !== 6) return timeStr;
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
}

/**
 * 큰 숫자 축약 (억, 조 단위)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_0000_0000_0000) {
    return `${(value / 1_0000_0000_0000).toFixed(2)}조`;
  }
  if (value >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(0)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return formatNumber(value);
}
