'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiJson } from '@/lib/api/client'

const roles = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Staff', value: 'MEMBER' },
  { label: 'Student', value: 'STUDENT' },
] as const

type Role = (typeof roles)[number]['value']

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('ADMIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('registered') === '1') {
      setSuccessMessage('College registered! Please log in.')
    }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const endpoint =
      role === 'ADMIN'
        ? '/api/auth/admin/login'
        : role === 'MEMBER'
          ? '/api/auth/member/login'
          : '/api/auth/student/login'

    const { res, data } = await apiJson<{ ok: boolean; data?: any; error?: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Login failed')
      return
    }

    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('userType', role)
    localStorage.setItem('userName', email)

    router.replace(
      role === 'ADMIN'
        ? '/admin/dashboard'
        : role === 'MEMBER'
          ? '/member/dashboard'
          : '/student/dashboard'
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 'min(900px, 100%)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          <div style={{ padding: '36px', background: 'var(--surface-2)' }}>
            <div
              style={{
                fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
                fontSize: '32px',
                marginBottom: '8px',
              }}
            >
              KEC Hostel
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>Hostel & Leave Management</div>
          </div>
          <div style={{ padding: '36px' }}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {successMessage ? (
                <div
                  style={{
                    background: 'var(--mint)',
                    color: '#1a5c3a',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    fontSize: '14px',
                  }}
                >
                  {successMessage}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: '8px' }}>
                {roles.map((item) => {
                  const active = item.value === role
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRole(item.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: active ? 'var(--sage-light)' : 'var(--surface)',
                        color: active ? 'var(--sage-dark)' : 'var(--text-secondary)',
                        fontWeight: active ? 600 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Password</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius)',
                      padding: '0 12px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {error ? (
                <div
                  style={{
                    background: 'var(--rose)',
                    color: '#7a2020',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                style={{
                  background: 'var(--sage)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Sign In
              </button>
              {role === 'ADMIN' ? (
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--sage-dark)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    fontSize: '14px',
                  }}
                >
                  New college? Register here
                </button>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
