/**
 * Billing period: 27th of previous month → 26th of current month.
 * - If today ≥ 27: current cycle is 27th this month → 26th next month.
 * - Otherwise: 27th last month → 26th this month.
 *
 * Annual billing cycle for a given year: Dec 27 (year-1) → Dec 26 (year).
 * The 12 monthly periods within that cycle:
 *   Period 1 (Jan): Dec 27 (year-1) → Jan 26 (year)
 *   Period 2 (Feb): Jan 27 (year)   → Feb 26 (year)
 *   ...
 *   Period 12 (Des): Nov 27 (year)  → Dec 26 (year)
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

/** Current monthly billing period (used as default date range in Transaksi). */
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

export interface AnnualBillingRange extends BillingPeriod {
  year: number
}

/**
 * Full annual billing cycle for a given year:
 * Dec 27 (year - 1) → Dec 26 (year).
 */
export function getAnnualBillingRange(year?: number): AnnualBillingRange {
  const y = year ?? new Date().getFullYear()
  const from = new Date(y - 1, 11, 27) // Dec 27 previous year
  const to   = new Date(y,     11, 26) // Dec 26 current year

  const label = `${from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} – ${to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return { from: toLocalDateStr(from), to: toLocalDateStr(to), label, year: y }
}

/**
 * Given a transaction date (YYYY-MM-DD) and a year, returns which billing-period
 * month (1 = Jan … 12 = Dec) the date falls into, or null if outside the annual cycle.
 *
 * Period mapping for year Y:
 *   Month 1  (Jan): {Y-1}-12-27 → {Y}-01-26
 *   Month 2  (Feb): {Y}-01-27   → {Y}-02-26
 *   …
 *   Month 12 (Des): {Y}-11-27   → {Y}-12-26
 */
export function getBillingMonthIndex(dateStr: string, year: number): number | null {
  for (let m = 1; m <= 12; m++) {
    const fromYear  = m === 1 ? year - 1 : year
    const fromMonth = m === 1 ? 12 : m - 1
    const from = `${fromYear}-${String(fromMonth).padStart(2, '0')}-27`
    const to   = `${year}-${String(m).padStart(2, '0')}-26`
    if (dateStr >= from && dateStr <= to) return m
  }
  return null
}
