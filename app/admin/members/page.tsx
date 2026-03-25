'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'

type Role = { id: string; name: string }

type Member = {
  id: string
  name: string
  email: string
  role?: Role | null
  class?: { id: string; name: string } | null
  hostel?: { id: string; name: string } | null
}

type Option = { id: string; name: string }

type FormState = {
  id?: string
  name: string
  email: string
  password: string
  roleId: string
  classId: string
  hostelId: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  roleId: '',
  classId: '',
  hostelId: '',
}

export default function MembersPage() {
  const { data: membersData, loading: membersLoading, refresh: refreshMembers, fetchedAt } =
    useCachedFetch<Member[]>('/api/members')
  const { data: rolesData, loading: rolesLoading, refresh: refreshRoles } =
    useCachedFetch<Role[]>('/api/roles')
  const { data: classesData, loading: classesLoading, refresh: refreshClasses } =
    useCachedFetch<Option[]>('/api/classes')
  const { data: hostelsData, loading: hostelsLoading, refresh: refreshHostels } =
    useCachedFetch<Option[]>('/api/hostels')
  const members = membersData ?? []
  const roles = rolesData ?? []
  const classes = classesData ?? []
  const hostels = hostelsData ?? []
  const loading = membersLoading || rolesLoading || classesLoading || hostelsLoading
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [addMode, setAddMode] = useState<'manual' | 'bulk'>('manual')
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkResults, setBulkResults] = useState<null | { created: number; skipped: number; results: any[] }>(null)
  const [bulkError, setBulkError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast, showToast, clearToast } = useToast()
  const collegeDomain = typeof window !== 'undefined' ? localStorage.getItem('collegeDomain') : null

  const fieldRowStyle = {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '12px',
    alignItems: 'center',
  } as const

  const fieldLabelStyle = {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  } as const

  const handleRefresh = async () => {
    await Promise.all([refreshMembers(), refreshRoles(), refreshClasses(), refreshHostels()])
  }

  const openAdd = () => {
    setForm(emptyForm)
    setError('')
    setAddMode('manual')
    setBulkFile(null)
    setBulkResults(null)
    setBulkError('')
    setIsOpen(true)
  }

  const openEdit = (member: Member) => {
    setForm({
      id: member.id,
      name: member.name,
      email: member.email,
      password: '',
      roleId: member.role?.id ?? '',
      classId: member.class?.id ?? '',
      hostelId: member.hostel?.id ?? '',
    })
    setError('')
    setAddMode('manual')
    setBulkFile(null)
    setBulkResults(null)
    setBulkError('')
    setIsOpen(true)
  }

  const submit = async () => {
    setError('')
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required')
      return
    }
    if (!form.roleId) {
      setError('Role is required')
      return
    }

    if (!form.id && form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const payload: any = {
      name: form.name.trim(),
      roleId: form.roleId,
      classId: form.classId || null,
      hostelId: form.hostelId || null,
    }

    if (!form.id) {
      if (collegeDomain) {
        const emailDomain = form.email.trim().split('@')[1] ?? ''
        if (emailDomain && emailDomain !== collegeDomain) {
          showToast(
            `Warning: Email domain @${emailDomain} doesn't match college domain @${collegeDomain}. Continue?`,
            'info'
          )
          if (
            !window.confirm(
              `Email domain @${emailDomain} doesn't match your college domain @${collegeDomain}. Add anyway?`
            )
          ) {
            return
          }
        }
      }
      payload.email = form.email.trim()
      payload.password = form.password
      const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok || !data?.ok) {
        showToast(data?.error ?? 'Failed to add member', 'error')
        return
      }
      showToast('Member added', 'success')
    } else {
      const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
        `/api/members/${form.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok || !data?.ok) {
        showToast(data?.error ?? 'Failed to update member', 'error')
        return
      }
      showToast('Member updated', 'success')
    }

    setIsOpen(false)
    setForm(emptyForm)
    cache.invalidate('/api/members')
    refreshMembers()
  }

  const remove = async (id: string) => {
    if (!window.confirm('Remove this member? This cannot be undone.')) return
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(`/api/members/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok || !data?.ok) {
      showToast(data?.error ?? 'Failed to remove member', 'error')
      return
    }
    showToast('Member removed', 'info')
    cache.invalidate('/api/members')
    refreshMembers()
  }

  const parseBulkFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(sheet)
          resolve(rows)
        } catch {
          reject(new Error('Failed to parse file'))
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  const submitBulk = async () => {
    setBulkError('')
    if (!bulkFile) {
      setBulkError('Please select a file')
      return
    }

    let rows: any[]
    try {
      rows = await parseBulkFile(bulkFile)
    } catch {
      setBulkError('Could not read file. Make sure it is a valid CSV or Excel file.')
      return
    }

    if (rows.length === 0) {
      setBulkError('File is empty')
      return
    }

    const normalized = rows.map((row: any) => ({
      name: row.name ?? row.Name ?? row.NAME ?? '',
      email: row.email ?? row.Email ?? row.EMAIL ?? '',
      password: String(row.password ?? row.Password ?? row.PASSWORD ?? ''),
      role: row.role ?? row.Role ?? row.ROLE ?? '',
    }))

    const { res, data } = await apiJson<{ ok: boolean; data?: typeof bulkResults; error?: string }>(
      '/api/members/bulk',
      { method: 'POST', body: JSON.stringify({ rows: normalized }) }
    )

    if (!res.ok || !data?.ok) {
      const message = data?.error ?? 'Upload failed'
      setBulkError(message)
      showToast(message, 'error')
      return
    }

    setBulkResults(data.data ?? null)
    if (data.data) {
      showToast(`${data.data.created} members created, ${data.data.skipped} skipped`, 'success')
    }
    cache.invalidate('/api/members')
    refreshMembers()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Members
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <RefreshButton onRefresh={handleRefresh} fetchedAt={fetchedAt} />
          <button
            onClick={openAdd}
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
            Add Member
          </button>
        </div>
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (item: Member) => item.role?.name ?? '-' },
          {
            key: 'scope',
            label: 'Scope',
            render: (item: Member) => {
              const className = item.class?.name
              const hostelName = item.hostel?.name
              if (!className && !hostelName) return 'Full Access'
              return [className, hostelName].filter(Boolean).join(' / ')
            },
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Member) => (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => openEdit(item)}
                  style={{
                    background: 'var(--sage-light)',
                    color: 'var(--sage-dark)',
                    border: '1px solid var(--border)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(item.id)}
                  style={{
                    background: 'var(--rose)',
                    color: '#7a2020',
                    border: '1px solid var(--border)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ),
          },
        ]}
        data={members}
        emptyMessage="No members added yet."
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={form.id ? 'Edit Member' : 'Add Member'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!form.id && (
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              {(['manual', 'bulk'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAddMode(mode)
                    setBulkResults(null)
                    setBulkError('')
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: addMode === mode ? 'var(--sage-light)' : 'var(--surface)',
                    color: addMode === mode ? 'var(--sage-dark)' : 'var(--text-secondary)',
                    fontWeight: addMode === mode ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'manual' ? 'Manual' : 'Upload CSV / Excel'}
                </button>
              ))}
            </div>
          )}

          {addMode === 'manual' || form.id ? (
            <>
              <label style={fieldRowStyle}>
                <span style={fieldLabelStyle}>Name</span>
                <input
                  placeholder="Name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                />
              </label>
              <label style={fieldRowStyle}>
                <span style={fieldLabelStyle}>Email</span>
                <input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  disabled={Boolean(form.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                />
              </label>
              {!form.id ? (
                <label style={fieldRowStyle}>
                  <span style={fieldLabelStyle}>Password</span>
                  <input
                    placeholder="Password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                    }}
                  />
                </label>
              ) : null}
              <label style={fieldRowStyle}>
                <span style={fieldLabelStyle}>Role</span>
                <select
                  value={form.roleId}
                  onChange={(event) => setForm({ ...form, roleId: event.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldRowStyle}>
                <span style={fieldLabelStyle}>Class</span>
                <select
                  value={form.classId}
                  onChange={(event) => setForm({ ...form, classId: event.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <option value="">No restriction (class)</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldRowStyle}>
                <span style={fieldLabelStyle}>Hostel</span>
                <select
                  value={form.hostelId}
                  onChange={(event) => setForm({ ...form, hostelId: event.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <option value="">No restriction (hostel)</option>
                  {hostels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {error ? (
                <div
                  style={{
                    background: 'var(--rose)',
                    color: '#7a2020',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {error}
                </div>
              ) : null}
              <button
                onClick={submit}
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
                {form.id ? 'Save Changes' : 'Add Member'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with columns:
                <br />
                <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                  name, email, password, role
                </code>
                <br />
                where{' '}
                <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                  role
                </code>{' '}
                matches an existing role name in your college.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '2px dashed var(--border)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                {bulkFile ? bulkFile.name : 'Click to choose file'}
              </button>

              {bulkError && (
                <div
                  style={{
                    background: 'var(--rose)',
                    color: '#7a2020',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                  }}
                >
                  {bulkError}
                </div>
              )}

              {bulkResults && (
                <div
                  style={{
                    background: 'var(--mint)',
                    color: '#1a5c3a',
                    padding: '12px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                  }}
                >
                  <strong>{bulkResults.created} created</strong>, {bulkResults.skipped} skipped
                  {bulkResults.results
                    .filter((r) => r.status === 'skipped')
                    .map((r) => (
                      <div key={r.row} style={{ marginTop: '4px', opacity: 0.8 }}>
                        Row {r.row} ({r.email}): {r.reason}
                      </div>
                    ))}
                </div>
              )}

              <button
                type="button"
                onClick={submitBulk}
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
                Upload & Create Members
              </button>
            </div>
          )}
        </div>
      </Modal>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
    </div>
  )
}
