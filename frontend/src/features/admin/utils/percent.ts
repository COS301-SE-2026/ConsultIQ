// Three distinct percentage sources from the analytics API.

/** For values already expressed 0–100 (e.g. utilisationPercent). */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/** For raw 0–1 fractions (e.g. averageConfidence). */
export function formatFractionAsPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Derives a rate from two counts — guards the zero-CVs-processed case
 *  explicitly, rather than letting the UI show "NaN%". */
export function formatRate(numerator: number, denominator: number, decimals = 0): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(decimals)}%`;
}