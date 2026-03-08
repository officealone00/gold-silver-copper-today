export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

export function formatCurrency(num: number, unit: string = '원'): string {
  return `${formatNumber(Math.round(num))} ${unit}`;
}

export function formatPercent(num: number): string {
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}년 ${m}월 ${d}일`;
}
