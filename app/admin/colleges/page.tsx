'use client'

import { useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'

type College = {
  id: string
  name: string
  location: string
  domain?: string | null
  createdAt: string
  admins: { id: string; name: string; email: string }[]
}

type CollegeForm = { name: string; location: string; domain: string }

type AdminForm = { name: string; email: string; password: string; collegeId: string }

const emptyCollege: CollegeForm = { name: '', location: '', domain: '' }
const emptyAdmin: AdminForm = { name: '', email: '', password: '', collegeId: '' }

export default function AdminCollegesPage() {
  const { data: colleges = [], loading, refresh, fetchedAt } =
    useCachedFetch<College[]>('/api/superadmin/colleges')
  const [isOpen, setIsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [form, setForm] = useState<CollegeForm>(emptyCollege)
  const [adminForm, setAdminForm] = useState<AdminForm>(emptyAdmin)
  const { toast, showToast, clearToast } = useToast()

  const createCollege = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      showToast('Name and location are required', 'error')
      return
    }
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/superadmin/colleges', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        location: form.location.trim(),
        domain: form.domain.trim() || undefined,
      }),
    })
    if (!res.ok || !data?.ok) {
      showToast(data?.error ?? 'Failed to create college', 'error')
      return
    }
    setIsOpen(false)
    setForm(emptyCollege)
    showToast('College created', 'success')
    cache.invalidate('/api/superadmin/colleges')
    refresh()
  }

  const openAdminModal = (collegeId: string) => {
    setAdminForm({ ...emptyAdmin, collegeId })
    setAdminOpen(true)
  }

  const createAdmin = async () => {
    if (!adminForm.name.trim() || !adminForm.email.trim() || adminForm.password.length < 8) {
      showToast('Provide name, email, and a password (min 8 chars)', 'error')
      return
    }
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/superadmin/admins', {
      method: 'POST',
      body: JSON.stringify({
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password,
        collegeId: adminForm.collegeId,
      }),
    })
    if (!res.ok || !data?.ok) {
      showToast(data?.error ?? 'Failed to create admin', 'error')
      return
    }
    setAdminOpen(false)
    setAdminForm(emptyAdmin)
    showToast('Admin created', 'success')
    cache.invalidate('/api/superadmin/colleges')
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Colleges
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
          <button
            onClick={() => setIsOpen(true)}
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
            Create College
          </button>
        </div>
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'name', label: 'College Name' },
          { key: 'location', label: 'Location' },
          { key: 'domain', label: 'Domain', render: (item: College) => item.domain ?? '-' },
          {
            key: 'admins',
            label: 'Admins',
            render: (item: College) =>
              item.admins.length > 0
                ? item.admins.map((admin) => admin.email).join(', ')
                : 'No admins',
          },
          { key: 'createdAt', label: 'Created At', render: (item: College) => new Date(item.createdAt).toLocaleDateString() },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: College) => (
              <button
                onClick={() => openAdminModal(item.id)}
                style={{
                  background: 'var(--sage-light)',
                  color: 'var(--sage-dark)',
                  border: '1px solid var(--border)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
              >
                Set Admin
              </button>
            ),
          },
        ]}
        data={colleges}
        emptyMessage="No colleges found."
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create College">
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            placeholder="College Name"
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <input
            placeholder="Location"
            value={form.location}
            onChange={(event) => setForm((f) => ({ ...f, location: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <input
            placeholder="Domain (optional)"
            value={form.domain}
            onChange={(event) => setForm((f) => ({ ...f, domain: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <button
            onClick={createCollege}
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
            Submit
          </button>
        </div>
      </Modal>

      <Modal isOpen={adminOpen} onClose={() => setAdminOpen(false)} title="Set Admin">
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            placeholder="Name"
            value={adminForm.name}
            onChange={(event) => setAdminForm((f) => ({ ...f, name: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <input
            placeholder="Email"
            type="email"
            value={adminForm.email}
            onChange={(event) => setAdminForm((f) => ({ ...f, email: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <input
            placeholder="Password"
            type="password"
            value={adminForm.password}
            onChange={(event) => setAdminForm((f) => ({ ...f, password: event.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          <button
            onClick={createAdmin}
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
            Submit
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
    </div>
  )
}
