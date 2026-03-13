'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Tag, 
  Upload, 
  LogOut 
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/kategori', label: 'Kategori', icon: Tag },
  { href: '/impor', label: 'Impor', icon: Upload },
]

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-sidebar border-r border-sidebar-border shrink-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/20">
            <span className="text-lg">💰</span>
          </div>
          <div>
            <p className="font-semibold text-sm">Cashflow</p>
            <p className="text-xs text-muted-foreground truncate max-w-[130px]">{user.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </aside>
  )
}
