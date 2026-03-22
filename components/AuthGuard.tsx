'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthGuard({
  children,
  allowedType,
}: {
  children: React.ReactNode
  allowedType: 'ADMIN' | 'MEMBER' | 'STUDENT'
}) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const type = localStorage.getItem('userType')
    if (!token || type !== allowedType) {
      router.replace('/login')
    }
  }, [allowedType, router])

  return <>{children}</>
}
