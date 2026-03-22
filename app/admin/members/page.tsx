'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

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
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [classes, setClasses] = useState<Option[]>([])
  const [hostels, setHostels] = useState<Option[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')

  const load = async () => {
    const [membersRes, rolesRes, classesRes, hostelsRes] = await Promise.all([
      apiJson<{ ok: boolean; data: Member[] }>('/api/members'),
      apiJson<{ ok: boolean; data: Role[] }>('/api/roles'),
      apiJson<{ ok: boolean; data: Option[] }>('/api/classes'),
      apiJson<{ ok: boolean; data: Option[] }>('/api/hostels'),
    ])
    if (membersRes.data?.ok) setMembers(membersRes.data.data)
    if (rolesRes.data?.ok) setRoles(rolesRes.data.data)
    if (classesRes.data?.ok) setClasses(classesRes.data.data)
    if (hostelsRes.data?.ok) setHostels(hostelsRes.data.data)
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setError('')
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
      payload.email = form.email.trim()
      payload.password = form.password
      const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Failed to add member')
        return
      }
    } else {
      const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
        `/api/members/${form.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Failed to update member')
        return
      }
    }

    setIsOpen(false)
    setForm(emptyForm)
    load()
  }

  const remove = async (id: string) => {
    await apiJson(`/api/members/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Members
        </h1>
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

      <Table
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
        <div style={{ display: 'grid', gap: '12px' }}>
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
          {!form.id ? (
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
          ) : null}
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
          {error ? (
            <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '8px 10px', borderRadius: 'var(--radius)' }}>
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
        </div>
      </Modal>
    </div>
  )
}
