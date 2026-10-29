// Redondeo y formato numérico con coma decimal, sin dependencias de locale.

const EPSILON = Number.EPSILON

export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + EPSILON) * factor) / factor
}

export function formatDecimal(value: number, decimals: number): string {
  return roundHalfUp(value, decimals).toFixed(decimals).replace(".", ",")
}

export function formatPercent(value: number): string {
  return `${roundHalfUp(value, 0)} %`
}

export function formatHours(value: number): string {
  return `${formatDecimal(value, 1)} h`
}

export function formatMinutesAsHours(minutes: number): string {
  return formatHours(minutes / 60)
}

export function formatGoalHours(hours: number): string {
  if (Number.isInteger(hours)) {
    return `${hours} h`
  }
  return formatHours(hours)
}
