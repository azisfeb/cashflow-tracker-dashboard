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
  quantity: number
  price?: number | null
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

export interface SpecialEvent {
  id: string
  user_id: string
  name: string
  date: string | null
  budget: number
  created_at: string
}

export interface SpecialEventExpense {
  id: string
  special_event_id: string
  user_id: string
  name: string
  category: string | null
  amount: number
  date: string | null
  created_at: string
}
