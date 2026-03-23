'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Shield, Users, GraduationCap, CalendarCheck } from 'lucide-react'
import { apiJson } from '@/lib/api/client'

type UserType = 'ADMIN' | 'MEMBER' | 'STUDENT'

type Permission = {
  module: string
  canView: boolean
}

export default function Sidebar({ userType }: { userType: UserType }) {
  const pathname = usePathname()
  const [userName, setUserName] = useState('User')
  const [roleLabel, setRoleLabel] = useState('User')
  const [permissions, setPermissions] = useState<{ students: boolean; leaves: boolean }>({
    students: true,
    leaves: true,
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetForm, setResetForm] = useState({ current: '', next: '', confirm: '' })
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    const storedName = localStorage.getItem('userName')
    if (storedName) setUserName(storedName)
    const storedRole = localStorage.getItem('userRoleName')
    if (storedRole) setRoleLabel(storedRole)
    else setRoleLabel(userType)
  }, [userType])

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

      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <div
          onClick={() => setProfileOpen((p) => !p)}
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            cursor: 'pointer',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
            {userName}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{roleLabel}</div>
        </div>

        {profileOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => {
                setProfileOpen(false)
                setShowResetModal(true)
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text-primary)',
              }}
            >
              Reset Password
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/login'
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#b91c1c',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {showResetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              width: 'min(400px, 90vw)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '18px' }}>Reset Password</div>

            {(['current', 'next', 'confirm'] as const).map((field) => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {field === 'current'
                    ? 'Current password'
                    : field === 'next'
                      ? 'New password'
                      : 'Confirm new password'}
                </label>
                <input
                  type="password"
                  value={resetForm[field]}
                  onChange={(e) => setResetForm((f) => ({ ...f, [field]: e.target.value }))}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                />
              </div>
            ))}

            {resetError && (
              <div
                style={{
                  background: 'var(--rose)',
                  color: '#7a2020',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius)',
                  fontSize: '13px',
                }}
              >
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div
                style={{
                  background: 'var(--mint)',
                  color: '#1a5c3a',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius)',
                  fontSize: '13px',
                }}
              >
                Password updated successfully!
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => {
                  setResetError('')
                  if (resetForm.next.length < 8) {
                    setResetError('New password must be at least 8 characters')
                    return
                  }
                  if (resetForm.next !== resetForm.confirm) {
                    setResetError('Passwords do not match')
                    return
                  }

                  const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
                    '/api/auth/change-password',
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        currentPassword: resetForm.current,
                        newPassword: resetForm.next,
                      }),
                    }
                  )

                  if (!res.ok || !data?.ok) {
                    setResetError(data?.error ?? 'Failed to update password')
                    return
                  }
                  setResetSuccess(true)
                  setTimeout(() => {
                    setShowResetModal(false)
                    setResetSuccess(false)
                    setResetForm({ current: '', next: '', confirm: '' })
                  }, 1500)
                }}
                style={{
                  flex: 1,
                  background: 'var(--sage)',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Update Password
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setResetError('')
                  setResetForm({ current: '', next: '', confirm: '' })
                }}
                style={{
                  flex: 1,
                  background: 'var(--surface-2)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  padding: '10px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
