'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Megaphone, Link as LinkIcon } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  linkUrl?: string | null
  linkLabel?: string | null
  postedBy: string
  role: string
  createdAt: Date | string
}

interface Props {
  announcements: Announcement[]
}

const AUTO_DELAY_MS = 5000

function getRoleBadge(role: string) {
  const normalized = role.toLowerCase()
  if (normalized.includes('chief')) return 'bg-purple-100 text-purple-700 border-purple-200'
  if (normalized.includes('warden')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (normalized.includes('admin')) return 'bg-red-100 text-red-700 border-red-200'
  if (normalized.includes('staff')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function AnnouncementsCarousel({ announcements }: Props) {
  const total = announcements.length
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [entered, setEntered] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const transitionClass = useMemo(() => {
    if (entered) return 'opacity-100 translate-x-0'
    return direction === 'next' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4'
  }, [direction, entered])

  const goTo = useCallback(
    (index: number, nextDirection: 'next' | 'prev') => {
      if (total === 0) return
      const nextIndex = (index + total) % total
      setDirection(nextDirection)
      setActiveIndex(nextIndex)
      setProgressKey((value) => value + 1)
    },
    [total]
  )

  const next = useCallback(() => goTo(activeIndex + 1, 'next'), [activeIndex, goTo])
  const prev = useCallback(() => goTo(activeIndex - 1, 'prev'), [activeIndex, goTo])

  useEffect(() => {
    if (total <= 1 || isPaused) return
    const timer = setTimeout(() => {
      next()
    }, AUTO_DELAY_MS)
    return () => clearTimeout(timer)
  }, [activeIndex, isPaused, next, total])

  useEffect(() => {
    setEntered(false)
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [activeIndex, direction])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') prev()
      if (event.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev])

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
          <Megaphone size={22} />
        </div>
        <p className="font-semibold" style={{ fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          No announcements
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Check back later for updates.</p>
      </div>
    )
  }

  const activeAnnouncement = announcements[activeIndex]
  const aspectRatio =
    activeAnnouncement.imageWidth && activeAnnouncement.imageHeight
      ? `${activeAnnouncement.imageWidth} / ${activeAnnouncement.imageHeight}`
      : '16 / 9'

  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] p-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return
        const endX = event.changedTouches[0]?.clientX ?? 0
        const delta = touchStartX.current - endX
        if (delta > 50) next()
        if (delta < -50) prev()
        touchStartX.current = null
      }}
    >
      <div className="relative">
        <div
          className={`relative w-full overflow-hidden rounded-xl transition-all duration-300 ${transitionClass}`}
          style={{
            aspectRatio,
            maxHeight: '360px',
            background: 'var(--surface-2)',
          }}
        >
          {activeAnnouncement.imageUrl ? (
            <Image
              src={activeAnnouncement.imageUrl}
              alt={activeAnnouncement.title}
              fill
              unoptimized
              className="object-contain"
              sizes="(max-width: 1280px) 100vw, 360px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--surface-2)] text-[var(--text-muted)]">
              <Megaphone size={36} />
            </div>
          )}
        </div>
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getRoleBadge(
              activeAnnouncement.role
            )}`}
          >
            {activeAnnouncement.role}
          </span>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
          {activeIndex + 1} / {total}
        </div>
      </div>

      <div className={`mt-4 space-y-2 transition-all duration-300 ${transitionClass}`}>
        <h3 className="line-clamp-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          {activeAnnouncement.title}
        </h3>
        <p className="line-clamp-3 text-sm text-[var(--text-secondary)]">
          {stripHtml(activeAnnouncement.description)}
        </p>
      </div>

      <div className={`mt-4 flex items-center justify-between gap-2 transition-all duration-300 ${transitionClass}`}>
        <div className="text-xs text-[var(--text-muted)]">
          <div>👤 {activeAnnouncement.postedBy}</div>
          <div>📅 {formatDate(activeAnnouncement.createdAt)}</div>
        </div>
        {activeAnnouncement.linkUrl ? (
          <a
            className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-dark)]"
            href={activeAnnouncement.linkUrl}
            target="_blank"
            rel="noreferrer"
          >
            <LinkIcon size={14} />
            {activeAnnouncement.linkLabel ?? 'Learn More'}
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {announcements.map((_, index) => (
            <button
              key={`dot-${index}`}
              onClick={() => goTo(index, index > activeIndex ? 'next' : 'prev')}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? 'w-6 bg-[var(--brand)]' : 'w-2 bg-[var(--border)]'
              }`}
              aria-label={`Go to announcement ${index + 1}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Previous announcement"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Next announcement"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          key={`progress-${progressKey}`}
          className="h-full w-full origin-left bg-[var(--brand)]"
          style={{
            animation: `announcement-progress ${AUTO_DELAY_MS}ms linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            transform: 'scaleX(0)',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes announcement-progress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  )
}
