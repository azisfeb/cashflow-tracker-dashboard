'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useNominalVisibility } from '@/components/layout/nominal-visibility-provider'
import { formatRupiah } from '@/lib/format'

interface DashboardStatCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
  annualLabel: string
}

export function DashboardStatCards({
  totalIncome,
  totalExpense,
  balance,
  annualLabel,
}: DashboardStatCardsProps) {
  const { isHidden } = useNominalVisibility()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="glass-panel glow-hover border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Pemasukan</CardTitle>
          <div className="p-2.5 rounded-xl bg-green-500/10 shadow-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-extrabold text-green-500 tracking-tight">
            {formatRupiah(totalIncome, isHidden)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{annualLabel}</p>
        </CardContent>
      </Card>

      <Card className="glass-panel glow-hover border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Pengeluaran</CardTitle>
          <div className="p-2.5 rounded-xl bg-red-500/10 shadow-sm">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-extrabold text-red-500 tracking-tight">
            {formatRupiah(totalExpense, isHidden)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{annualLabel}</p>
        </CardContent>
      </Card>

      <Card className="glass-panel glow-hover border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Saldo Bersih</CardTitle>
          <div className={`p-2.5 rounded-xl shadow-sm ${balance >= 0 ? 'bg-primary/10' : 'bg-red-500/10'}`}>
            <Wallet className={`h-4 w-4 ${balance >= 0 ? 'text-primary' : 'text-red-500'}`} />
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-extrabold tracking-tight ${balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
            {formatRupiah(balance, isHidden)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pemasukan − Pengeluaran</p>
        </CardContent>
      </Card>
    </div>
  )
}
