'use client'

import { useCallback, useState } from 'react'

type ToastState = { message: string; variant: 'success' | 'error' | 'info' } | null

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback(
    (message: string, variant: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, variant })
    },
    []
  )

  const clearToast = useCallback(() => setToast(null), [])

  return { toast, showToast, clearToast }
}
