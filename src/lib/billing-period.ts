/**
 * Billing period: 27th of previous month → 26th of current month.
 * - If today ≥ 27: current cycle is 27th this month → 26th next month.
 * - Otherwise: 27th last month → 26th this month.
 */

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface BillingPeriod {
  from: string  // YYYY-MM-DD
  to: string    // YYYY-MM-DD
  label: string // e.g. "27 Feb – 26 Mar 2026"
}

export function getBillingPeriod(now: Date = new Date()): BillingPeriod {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  let from: Date, to: Date
  if (now.getDate() >= 27) {
    from = new Date(year, month, 27)
    to = new Date(year, month + 1, 26)
  } else {
    from = new Date(year, month - 1, 27)
    to = new Date(year, month, 26)
  }

  const label = `${from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return { from: toLocalDateStr(from), to: toLocalDateStr(to), label }
}
