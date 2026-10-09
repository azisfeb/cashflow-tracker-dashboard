'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, UserX, UserCheck, ShieldCheck } from 'lucide-react'
import type { AdminUser, UserRole } from '@/lib/types'
import { adminUsersApi } from '@/lib/api-client'

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isBanned(user: AdminUser): boolean {
  if (!user.banned_until) return false
  return new Date(user.banned_until).getTime() > Date.now()
}

const emptyForm = {
  email: '',
  password: '',
  role: 'admin' as UserRole,
}

export function ManajemenAkunClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminUsersApi.list()
      setUsers(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat daftar user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function handleCreate() {
    if (!form.email || !form.password) {
      toast.error('Email dan password wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      await adminUsersApi.create(form)
      toast.success('User berhasil dibuat')
      setDialogOpen(false)
      setForm(emptyForm)
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat user')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRoleChange(id: string, role: UserRole) {
    setBusyId(id)
    try {
      await adminUsersApi.updateRole(id, role)
      toast.success('Role berhasil diperbarui')
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah role')
    } finally {
      setBusyId(null)
    }
  }

  async function handleToggleBan(user: AdminUser) {
    const banned = !isBanned(user)
    setBusyId(user.id)
    try {
      await adminUsersApi.setBanned(user.id, banned)
      toast.success(banned ? 'User dinonaktifkan' : 'User diaktifkan kembali')
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah status')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus user ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) return
    setBusyId(id)
    try {
      await adminUsersApi.remove(id)
      toast.success('User berhasil dihapus')
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus user')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada user.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const self = user.id === currentUserId
                  const banned = isBanned(user)
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.email ?? '-'}
                        {self && (
                          <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(v) =>
                            v && !self && handleRoleChange(user.id, v as UserRole)
                          }
                        >
                          <SelectTrigger className="w-36" disabled={self || busyId === user.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="superadmin">Superadmin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {banned ? (
                          <Badge variant="destructive">Nonaktif</Badge>
                        ) : (
                          <Badge variant="secondary">Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={self || busyId === user.id}
                            title={banned ? 'Aktifkan' : 'Nonaktifkan'}
                            onClick={() => handleToggleBan(user)}
                          >
                            {banned ? (
                              <UserCheck className="h-4 w-4" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={self || busyId === user.id}
                            title="Hapus"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Tambah User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@contoh.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => v && setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
