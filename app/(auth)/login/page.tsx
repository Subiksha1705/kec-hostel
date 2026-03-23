'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiJson } from '@/lib/api/client'

type College = { id: string; name: string; location: string }
type LoginType = 'ADMIN' | 'MEMBER' | 'STUDENT'

const LOGIN_TYPES: { label: string; value: LoginType }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Staff', value: 'MEMBER' },
  { label: 'Student', value: 'STUDENT' },
]

export default function LoginPage() {
  const router = useRouter()

  // Step 1 — college selection
  const [query, setQuery] = useState('')
  const [colleges, setColleges] = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Step 2 — login form
  const [loginType, setLoginType] = useState<LoginType>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Search colleges
  useEffect(() => {
    if (query.length < 3) {
      setColleges([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await apiJson<{ ok: boolean; data: College[] }>(
        `/api/colleges/search?q=${encodeURIComponent(query)}`
      )
      if (data?.ok) setColleges(data.data)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const selectCollege = (college: College) => {
    setSelectedCollege(college)
    setQuery(college.name)
    setDropdownOpen(false)
    setError('')
    localStorage.setItem('collegeName', college.name)
    localStorage.setItem('collegeId', college.id)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!selectedCollege) {
      setError('Please select your institution first')
      return
    }

    const endpoint =
      loginType === 'ADMIN'
        ? '/api/auth/admin/login'
        : loginType === 'MEMBER'
          ? '/api/auth/member/login'
          : '/api/auth/student/login'

    const { res, data } = await apiJson<{ ok: boolean; data?: any; error?: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email, password, collegeId: selectedCollege.id }),
    })

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Login failed')
      return
    }

    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('userType', loginType)
    localStorage.setItem('userName', data.data.name ?? email)
    if (data.data.roleName) localStorage.setItem('userRoleName', data.data.roleName)

    router.replace(
      loginType === 'ADMIN'
        ? '/admin/dashboard'
        : loginType === 'MEMBER'
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
          width: 'min(480px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* College selector */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '24px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
              fontSize: '22px',
              marginBottom: '16px',
            }}
          >
            Select your institution
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setDropdownOpen(true)
                setSelectedCollege(null)
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Type 3 or more characters..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${selectedCollege ? 'var(--sage)' : 'var(--border)'}`,
                background: 'var(--surface-2)',
                boxSizing: 'border-box',
              }}
            />
            {dropdownOpen && query.length >= 3 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  zIndex: 10,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '4px',
                }}
              >
                {colleges.length === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}
                  >
                    No institutions found
                  </div>
                ) : (
                  colleges.map((college) => (
                    <div
                      key={college.id}
                      onClick={() => selectCollege(college)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '14px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600 }}>{college.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {college.location}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {query.length > 0 && query.length < 3 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Please enter 3 or more characters
            </div>
          )}
        </div>

        {/* Login form — only shown after college is selected */}
        {selectedCollege && (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* User type tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {LOGIN_TYPES.map((item) => {
                  const active = item.value === loginType
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLoginType(item.value)}
                      style={{
                        flex: 1,
                        padding: '10px',
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
                  onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
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
                    onClick={() => setShowPassword((p) => !p)}
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

              {error && (
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
              )}

              <button
                type="submit"
                style={{
                  background: 'var(--sage)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Sign In
              </button>

              {loginType === 'ADMIN' && (
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
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
