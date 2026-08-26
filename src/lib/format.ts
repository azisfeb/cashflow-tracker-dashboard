/**
 * Formats a number into Indonesian Rupiah currency string.
 * When isHidden is true, masks the number (e.g. "Rp ••••••" or "-Rp ••••••").
 */
export function formatRupiah(amount: number, isHidden = false): string {
  if (isHidden) {
    if (amount < 0) return '-Rp ••••••'
    return 'Rp ••••••'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a number into compact abbreviation (e.g. 1.5jt, 500rb).
 * When isHidden is true, masks the abbreviation as "••••".
 */
export function formatCompact(amount: number, isHidden = false): string {
  if (isHidden) return '••••'
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
  return `${amount}`
}
