import { createClient } from '@/lib/supabase/client'
import type { AdminUser, UserRole } from '@/lib/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? 'Terjadi kesalahan')
  }
  return (body as { data: T }).data
}

export const adminUsersApi = {
  async list(): Promise<AdminUser[]> {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: await authHeaders(),
      cache: 'no-store',
    })
    return handle<AdminUser[]>(res)
  },

  async create(input: { email: string; password: string; role: UserRole }): Promise<AdminUser> {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(input),
    })
    return handle<AdminUser>(res)
  },

  async updateRole(id: string, role: UserRole): Promise<AdminUser> {
    const res = await fetch(`${API_URL}/api/admin/users/${id}/role`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ role }),
    })
    return handle<AdminUser>(res)
  },

  async setBanned(id: string, banned: boolean): Promise<void> {
    const res = await fetch(`${API_URL}/api/admin/users/${id}/ban`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ banned }),
    })
    return handle<void>(res)
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    })
    return handle<void>(res)
  },
}
