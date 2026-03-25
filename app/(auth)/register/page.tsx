'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiJson } from '@/lib/api/client'

export default function RegisterPage() {
  const router = useRouter()
  const [collegeName, setCollegeName] = useState('')
  const [collegeLocation, setCollegeLocation] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSuper, setIsSuper] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const type = localStorage.getItem('userType')
    setIsSuper(type === 'SUPER')
    setChecked(true)
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      '/api/auth/admin/register',
      {
        method: 'POST',
        body: JSON.stringify({
          collegeName,
          collegeLocation,
          adminName,
          email,
          password,
        }),
      }
    )

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Registration failed')
      return
    }

    router.replace('/login?registered=1')
  }

  if (checked && !isSuper) {
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
            width: 'min(560px, 100%)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            padding: '32px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
              fontSize: '24px',
              marginBottom: '8px',
            }}
          >
            Super Admin Only
          </div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Creating a college is restricted to super admins.
          </div>
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Back to login
          </button>
        </div>
      </div>
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
          width: 'min(720px, 100%)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          padding: '36px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
            fontSize: '28px',
            marginBottom: '6px',
          }}
        >
          Register College
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Create your college and admin account.
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>College Name</label>
            <input
              value={collegeName}
              onChange={(event) => setCollegeName(event.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              College Location
            </label>
            <input
              value={collegeLocation}
              onChange={(event) => setCollegeLocation(event.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your Name</label>
            <input
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
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
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
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
            Create College
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
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
            Back to login
          </button>
        </form>
      </div>
    </div>
  )
}
