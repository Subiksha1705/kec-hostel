export default function AnnouncementsLoading() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 animate-pulse">
      <div className="relative w-full h-44 rounded-xl bg-[var(--surface-2)]" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-3/4 rounded-full bg-[var(--surface-2)]" />
        <div className="h-4 w-2/3 rounded-full bg-[var(--surface-2)]" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-24 rounded-full bg-[var(--surface-2)]" />
        <div className="h-8 w-20 rounded-full bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}
