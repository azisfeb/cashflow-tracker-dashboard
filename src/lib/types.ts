export type TransactionType = 'income' | 'expense'
export type TransactionSource = 'manual' | 'import' | 'telegram'
export type CategoryType = 'income' | 'expense'
export type ImportStatus = 'pending' | 'done' | 'error'
export type UserRole = 'superadmin' | 'admin'

export interface Profile {
  id: string
  email: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  email: string | undefined
  role: UserRole
  banned_until: string | null
  created_at: string
  last_sign_in_at: string | null
}

export interface Category {
  id: string
  user_id: string
  owner_id?: string
  name: string
  type: CategoryType
  color: string
  icon?: string | null
  created_at: string
  budget_category_id?: string | null
}

export interface BudgetCategory {
  id: string
  owner_id?: string
  name: string
  sort_order: number
  created_at: string
}

export interface Budget {
  id: string
  owner_id?: string
  budget_category_id: string
  period_start: string
  amount: number
  created_at: string
  updated_at: string
}

export interface BudgetSummaryItem {
  budget_category_id: string
  name: string
  budget_amount: number
  used: number
  remaining: number
}

export interface Transaction {
  id: string
  user_id: string
  owner_id?: string
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
  created_by?: string | null
  updated_by?: string | null
  updated_at?: string | null
  deleted_by?: string | null
  deleted_at?: string | null
  categories?: Category | null
}

export interface ImportLog {
  id: string
  user_id: string
  owner_id?: string
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
  owner_id?: string
  name: string
  date: string | null
  budget: number
  created_at: string
}

export interface SpecialEventExpense {
  id: string
  special_event_id: string
  user_id: string
  owner_id?: string
  name: string
  category: string | null
  amount: number
  date: string | null
  created_at: string
}
