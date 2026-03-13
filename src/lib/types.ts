export type TransactionType = 'income' | 'expense'
export type TransactionSource = 'manual' | 'import' | 'telegram'
export type CategoryType = 'income' | 'expense'
export type ImportStatus = 'pending' | 'done' | 'error'

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  color: string
  icon?: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id?: string | null
  amount: number
  type: TransactionType
  description: string
  date: string
  source: TransactionSource
  telegram_message_id?: string | null
  created_at: string
  categories?: Category | null
}

export interface ImportLog {
  id: string
  user_id: string
  filename: string
  row_count: number
  status: ImportStatus
  created_at: string
}

export interface MonthlySummary {
  month: string
  income: number
  expense: number
}
