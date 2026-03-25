'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import ChatbotWidget from '@/components/ChatbotWidget'

type UserType = 'ADMIN' | 'MEMBER' | 'STUDENT'

type Props = {
  userType: UserType
  children: ReactNode
  showChatbot?: boolean
}

const MIN_WIDTH = 200
const MAX_WIDTH = 320
const DEFAULT_WIDTH = 220
const STORAGE_KEY = 'sidebarWidth'

export default function ResizableSidebarShell({ userType, children, showChatbot }: Props) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const draggingRef = useRef(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const parsed = stored ? Number(stored) : NaN
    if (!Number.isNaN(parsed)) {
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed)))
    }
  }, [])

  const finishDrag = useCallback(() => {
    draggingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.localStorage.setItem(STORAGE_KEY, String(width))
  }, [width])

  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!draggingRef.current) return
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX))
    setWidth(next)
  }, [])

  const onMouseDown = useCallback(() => {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', finishDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', finishDrag)
    }
  }, [finishDrag, onMouseMove])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex' }}>
        <Sidebar userType={userType} width={width} />
        <div
          onMouseDown={onMouseDown}
          style={{
            width: '6px',
            cursor: 'col-resize',
            background: 'transparent',
          }}
        />
      </div>
      <main style={{ flex: 1, padding: '32px' }}>{children}</main>
      {showChatbot ? <ChatbotWidget /> : null}
    </div>
  )
}
