import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { NominalVisibilityProvider } from '@/components/layout/nominal-visibility-provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()

  if (!user) redirect('/login')

  return (
    <NominalVisibilityProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <MobileHeader user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </NominalVisibilityProvider>
  )
}
