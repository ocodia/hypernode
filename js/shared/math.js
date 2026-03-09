export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function positiveModulo(value, divisor) {
  if (!Number.isFinite(divisor) || divisor === 0) return 0;
  return ((value % divisor) + divisor) % divisor;
}
