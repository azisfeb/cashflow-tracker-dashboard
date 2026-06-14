import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

interface Transaction {
  amount: number
  type: string
  date: string
  description: string
  categories?: { name: string; color: string } | null
}

interface Props {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <Card className="glass-panel border-border/40 h-full glow-hover">
      <CardHeader>
        <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
        )}
        {transactions.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${t.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {t.type === 'income' 
                ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.description || '—'}</p>
              <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {t.type === 'expense' ? '-' : '+'}{formatRupiah(t.amount)}
              </p>
              {t.categories && (
                <span 
                  className="text-xs px-1.5 py-0.5 rounded-sm"
                  style={{ backgroundColor: t.categories.color + '33', color: t.categories.color }}
                >
                  {t.categories.name}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
