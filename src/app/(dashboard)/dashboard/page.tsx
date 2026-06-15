import { createClient, getCachedUser } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { ExpenseByCategoryChart } from '@/components/dashboard/expense-by-category-chart'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { getAnnualBillingRange, getBillingMonthIndex } from '@/lib/billing-period'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default async function DashboardPage() {
  const user = await getCachedUser()
  const supabase = await createClient()

  const now = new Date()
  const annual = getAnnualBillingRange(now.getFullYear())

  // Fetch all transactions within the annual billing cycle
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, date, description, category_id, categories(name, color)')
    .eq('user_id', user!.id)
    .gte('date', annual.from)
    .lte('date', annual.to)
    .order('date', { ascending: false })

  const allTransactions = transactions ?? []

  // Stat cards: totals for the full annual billing cycle
  const totalIncome = allTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense

  // Monthly chart: group by billing period (27th→26th), not calendar month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthlyMap = new Map<number, { income: number; expense: number }>()
  for (let m = 1; m <= 12; m++) monthlyMap.set(m, { income: 0, expense: 0 })

  allTransactions.forEach(t => {
    const m = getBillingMonthIndex(t.date, annual.year)
    if (m === null) return
    const entry = monthlyMap.get(m)!
    if (t.type === 'income') entry.income += Number(t.amount)
    else entry.expense += Number(t.amount)
  })

  const chartData = Array.from(monthlyMap.entries()).map(([m, val]) => ({
    month: monthNames[m - 1],
    ...val,
  }))

  const recentTransactions = allTransactions.slice(0, 5).map(t => ({
    ...t,
    categories: Array.isArray(t.categories) ? (t.categories[0] ?? null) : t.categories,
  }))

  const expenseTransactions = allTransactions.filter(t => t.type === 'expense')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Siklus tahunan {annual.label}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel glow-hover border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Pemasukan</CardTitle>
            <div className="p-2.5 rounded-xl bg-green-500/10 shadow-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-green-500 tracking-tight">{formatRupiah(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{annual.label}</p>
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
            <p className="text-2xl font-extrabold text-red-500 tracking-tight">{formatRupiah(totalExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">{annual.label}</p>
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
              {formatRupiah(balance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pemasukan − Pengeluaran</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyChart data={chartData} />
        </div>
        <div>
          <RecentTransactions transactions={recentTransactions} />
        </div>
      </div>

      <ExpenseByCategoryChart
        transactions={expenseTransactions}
        billingYear={annual.year}
      />
    </div>
  )
}
