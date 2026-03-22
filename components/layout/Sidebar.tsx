'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Shield,
  Users,
  GraduationCap,
  CalendarCheck,
  LogOut,
} from 'lucide-react'
import { apiJson } from '@/lib/api/client'

type UserType = 'ADMIN' | 'MEMBER' | 'STUDENT'

type Permission = {
  module: string
  canView: boolean
}

export default function Sidebar({ userType }: { userType: UserType }) {
  const pathname = usePathname()
  const [userName, setUserName] = useState('User')
  const [permissions, setPermissions] = useState<{ students: boolean; leaves: boolean }>({
    students: true,
    leaves: true,
  })

  useEffect(() => {
    const storedName = localStorage.getItem('userName')
    if (storedName) setUserName(storedName)
  }, [])

  useEffect(() => {
    if (userType !== 'MEMBER') return
    let isMounted = true
    apiJson<{ ok: boolean; data: Permission[]; error?: string }>('/api/permissions')
      .then(({ data }) => {
        if (!isMounted || !data?.ok) return
        const perms = data.data ?? []
        const students = perms.find((p) => p.module === 'students')?.canView ?? false
        const leaves = perms.find((p) => p.module === 'leaves')?.canView ?? false
        setPermissions({ students, leaves })
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [userType])

  const navItems = useMemo(() => {
    if (userType === 'ADMIN') {
      return [
        { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { href: '/admin/roles', label: 'Roles', icon: <Shield size={18} /> },
        { href: '/admin/members', label: 'Members', icon: <Users size={18} /> },
        { href: '/admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
        { href: '/admin/leaves', label: 'Leaves', icon: <CalendarCheck size={18} /> },
      ]
    }
    if (userType === 'MEMBER') {
      return [
        { href: '/member/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        ...(permissions.students
          ? [{ href: '/member/students', label: 'Students', icon: <GraduationCap size={18} /> }]
          : []),
        ...(permissions.leaves
          ? [{ href: '/member/leaves', label: 'Leaves', icon: <CalendarCheck size={18} /> }]
          : []),
      ]
    }
    return [
      { href: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { href: '/student/leaves', label: 'My Leaves', icon: <CalendarCheck size={18} /> },
    ]
  }, [permissions.leaves, permissions.students, userType])

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <aside
      style={{
        width: '220px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
          fontSize: '22px',
          marginBottom: '8px',
        }}
      >
        KEC Hostel
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                color: active ? 'var(--sage-dark)' : 'var(--text-secondary)',
                background: active ? 'var(--sage-light)' : 'transparent',
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</div>
          <div>{userType}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
