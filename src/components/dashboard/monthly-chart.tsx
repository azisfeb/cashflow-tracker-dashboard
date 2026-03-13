'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function formatRupiah(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
  return `${amount}`
}

interface Props {
  data: Array<{ month: string; income: number; expense: number }>
}

export function MonthlyChart({ data }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Arus Kas Bulanan</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.24 0.04 172)" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: 'oklch(0.58 0.03 172)' }} 
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              tickFormatter={formatRupiah} 
              tick={{ fontSize: 11, fill: 'oklch(0.58 0.03 172)' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value))}
              contentStyle={{ 
                backgroundColor: 'oklch(0.115 0.025 172)',
                border: '1px solid oklch(0.24 0.04 172)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'oklch(0.87 0 0)' }}
              itemStyle={{ color: 'oklch(0.87 0 0)' }}
            />
            <Legend 
              formatter={(value) => value === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Bar dataKey="income" fill="oklch(0.55 0.13 168)" radius={[4, 4, 0, 0]} name="income" />
            <Bar dataKey="expense" fill="oklch(0.577 0.245 27)" radius={[4, 4, 0, 0]} name="expense" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
