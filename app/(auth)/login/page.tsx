'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiJson } from '@/lib/api/client'
import { cache } from '@/lib/cache'
import ErrorBanner from '@/components/ui/ErrorBanner'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

type College = { id: string; name: string; location: string; domain?: string | null }
type RoleOption = { id: string; name: string }
type LoginType = 'ADMIN' | 'MEMBER' | 'STUDENT'

type LoginOption = { label: string; value: LoginType; roleId?: string }

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Step 1 — college selection
  const [query, setQuery] = useState('')
  const [colleges, setColleges] = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [isSuperLogin, setIsSuperLogin] = useState(false)

  // Step 2 — login form
  const [loginType, setLoginType] = useState<LoginType>('STUDENT')
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  // Search colleges (skip for superadmin login)
  useEffect(() => {
    if (isSuperLogin) return
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
  }, [query, isSuperLogin])

  useEffect(() => {
    const message = searchParams.get('error') ?? searchParams.get('message')
    if (message) setBanner(message)
  }, [searchParams])

  useEffect(() => {
    if (isSuperLogin) return
    const storedId = localStorage.getItem('collegeId')
    const storedName = localStorage.getItem('collegeName')
    const storedDomain = localStorage.getItem('collegeDomain')
    if (storedId && storedName) {
      setSelectedCollege({ id: storedId, name: storedName, location: '', domain: storedDomain })
      setQuery(storedName)
      setDropdownOpen(false)
    }
  }, [isSuperLogin])

  useEffect(() => {
    if (isSuperLogin || !selectedCollege) {
      setRoles([])
      setSelectedRoleId(null)
      return
    }

    let isMounted = true
    apiJson<{ ok: boolean; data: RoleOption[]; error?: string }>(
      `/api/roles/public?collegeId=${encodeURIComponent(selectedCollege.id)}`
    )
      .then(({ data }) => {
        if (!isMounted || !data?.ok) return
        setRoles(data.data)
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [isSuperLogin, selectedCollege])

  const loginOptions = useMemo<LoginOption[]>(() => {
    return [
      { label: 'Admin', value: 'ADMIN' },
      { label: 'Student', value: 'STUDENT' },
      ...roles.map((role) => ({
        label: role.name,
        value: 'MEMBER' as const,
        roleId: role.id,
      })),
    ]
  }, [roles])

  const selectCollege = (college: College) => {
    setSelectedCollege(college)
    setQuery(college.name)
    setDropdownOpen(false)
    setError('')
    setBanner(null)
    localStorage.setItem('collegeName', college.name)
    localStorage.setItem('collegeId', college.id)
    localStorage.setItem('collegeDomain', college.domain ?? '')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!isSuperLogin && !selectedCollege) {
      setError('Please select your institution first')
      return
    }

    const endpoint = isSuperLogin
      ? '/api/auth/super/login'
      : loginType === 'ADMIN'
        ? '/api/auth/admin/login'
        : loginType === 'MEMBER'
          ? '/api/auth/member/login'
          : '/api/auth/student/login'

    setLoading(true)
    const { res, data } = await apiJson<{ ok: boolean; data?: any; error?: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        ...(selectedCollege ? { collegeId: selectedCollege.id } : {}),
      }),
    })
    setLoading(false)

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Login failed')
      return
    }

    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('userType', isSuperLogin ? 'SUPER' : loginType)
    localStorage.setItem('userName', data.data.name ?? email)
    if (data.data.roleName) localStorage.setItem('userRoleName', data.data.roleName)
    cache.clear()

    if (isSuperLogin) {
      router.replace('/admin/colleges')
      return
    }

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
          {banner && (
            <ErrorBanner
              message={banner}
              variant="info"
              onClose={() => setBanner(null)}
            />
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            gap: '10px',
            marginBottom: '4px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '18px',
            }}
          >
            N
          </div>
          <div
            style={{
              fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
              fontSize: '26px',
            }}
          >
            Nyroverve
          </div>
        </div>

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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
                fontSize: '22px',
              }}
            >
              {isSuperLogin ? 'Super Admin Login' : 'Select your institution'}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSuperLogin((prev) => {
                  const next = !prev
                  if (next) {
                    setSelectedCollege(null)
                    setQuery('')
                    setColleges([])
                    setSelectedRoleId(null)
                    setRoles([])
                  }
                  return next
                })
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sage-dark)',
                cursor: 'pointer',
                fontSize: '13px',
                padding: 0,
              }}
            >
              {isSuperLogin ? 'Back to college login' : 'Login as Super Admin'}
            </button>
          </div>
          {!isSuperLogin && (
            <>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value
                    setQuery(val)
                    setDropdownOpen(true)
                    if (selectedCollege && val !== selectedCollege.name) {
                      setSelectedCollege(null)
                    }
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Type 3 or more characters..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: selectedCollege
                      ? '1.5px solid var(--brand, var(--sage-dark))'
                      : '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {selectedCollege && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollege(null)
                      setQuery('')
                      setColleges([])
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      fontSize: '16px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
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
            </>
          )}
        </div>

        {/* Login form — only shown after college is selected */}
        {(selectedCollege || isSuperLogin) && (
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
              {!isSuperLogin && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {loginOptions.map((item) => {
                    const active =
                      item.value === 'MEMBER'
                        ? loginType === 'MEMBER' && selectedRoleId === item.roleId
                        : loginType === item.value
                    return (
                      <button
                        key={item.roleId ?? item.value}
                        type="button"
                        onClick={() => {
                          setLoginType(item.value)
                          setSelectedRoleId(item.roleId ?? null)
                        }}
                        style={{
                          flex: item.value === 'MEMBER' ? '0 0 auto' : 1,
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
              )}

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
                <ErrorBanner message={error} variant="error" onClose={() => setError('')} />
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

              <a
                href="/guest"
                style={{
                  textAlign: 'center',
                  color: 'var(--sage-dark)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                View hostel info without logging in →
              </a>
            </form>
          </div>
        )}
      </div>
      <LoadingOverlay visible={loading} label="Signing in..." />
    </div>
  )
}
