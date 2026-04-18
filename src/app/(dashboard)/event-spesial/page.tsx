import { createClient } from '@/lib/supabase/server'
import { EventSpesialClient } from '@/components/event-spesial/event-spesial-client'

export default async function EventSpesialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: events } = await supabase
    .from('special_events')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Spesial</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola budget dan pengeluaran untuk liburan atau acara khusus</p>
      </div>
      <EventSpesialClient initialEvents={events ?? []} />
    </div>
  )
}
