export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page title */}
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-muted" />
        <div className="h-4 w-56 rounded-md bg-muted/60" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-8 w-8 rounded-lg bg-muted" />
            </div>
            <div className="h-7 w-36 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 h-64" />
        <div className="rounded-xl border bg-card p-5 h-64" />
      </div>
    </div>
  )
}
