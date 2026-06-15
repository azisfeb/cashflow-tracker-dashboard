import { createClient, getCachedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EventDetailClient } from '@/components/event-spesial/event-detail-client'
import { ArrowLeft } from 'lucide-react'

export default async function EventSpesialDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const user = await getCachedUser()

  if (!user) redirect('/login')

  const supabase = await createClient()

  // Fetch the event and expenses in parallel
  const [{ data: event, error: eventError }, { data: expenses }] = await Promise.all([
    supabase
      .from('special_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('special_event_expenses')
      .select('*')
      .eq('special_event_id', id)
      .order('created_at', { ascending: false })
  ])

  if (eventError || !event) {
    redirect('/event-spesial')
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/event-spesial" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Kembali ke Event Spesial
        </Link>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        {event.date && (
          <p className="text-muted-foreground text-sm mt-1">
            {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <EventDetailClient event={event} initialExpenses={expenses ?? []} />
    </div>
  )
}

