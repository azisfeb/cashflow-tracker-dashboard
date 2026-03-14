'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Tag, 
  Upload, 
  LogOut,
  Menu
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/kategori', label: 'Kategori', icon: Tag },
  { href: '/impor', label: 'Impor', icon: Upload },
]

export function MobileHeader({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  const currentPage = navItems.find(item => 
    pathname === item.href || pathname.startsWith(item.href + '/')
  )?.label ?? 'Dashboard'

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-lg">💰</span>
        <span className="font-semibold text-sm">{currentPage}</span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/20">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Cashflow</p>
                <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user.email}</p>
              </div>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <span className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
