export function formatCredits(value: number, digits = 2) {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedCredits(value: number, digits = 2) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCredits(value, digits)}`;
}

export function formatSignedPercent(value: number, digits = 2) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercent(value, digits)}`;
}

export function valueTone(value: number) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}
