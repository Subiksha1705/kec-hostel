'use client'

import { useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'

type Student = {
  id: string
  name: string
  email: string
  rollNumber: string
  class?: { id: string; name: string } | null
  hostel?: { id: string; name: string } | null
}

type Option = { id: string; name: string }

type FormState = {
  id?: string
  name: string
  email: string
  password: string
  rollNumber: string
  classId: string
  hostelId: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  rollNumber: '',
  classId: '',
  hostelId: '',
}

export default function StudentsPage() {
  const { data: students = [], loading: studentsLoading, refresh: refreshStudents, fetchedAt } =
    useCachedFetch<Student[]>('/api/students')
  const { data: classes = [], loading: classesLoading, refresh: refreshClasses } =
    useCachedFetch<Option[]>('/api/classes')
  const { data: hostels = [], loading: hostelsLoading, refresh: refreshHostels } =
    useCachedFetch<Option[]>('/api/hostels')
  const loading = studentsLoading || classesLoading || hostelsLoading
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const { toast, showToast, clearToast } = useToast()
  const handleRefresh = async () => {
    await Promise.all([refreshStudents(), refreshClasses(), refreshHostels()])
  }

  const openAdd = () => {
    setForm(emptyForm)
    setError('')
    setIsOpen(true)
  }

  const openEdit = (student: Student) => {
    setForm({
      id: student.id,
      name: student.name,
      email: student.email,
      password: '',
      rollNumber: student.rollNumber,
      classId: student.class?.id ?? '',
      hostelId: student.hostel?.id ?? '',
    })
    setError('')
    setIsOpen(true)
  }

  const submit = async () => {
    setError('')
    if (!form.name.trim() || !form.rollNumber.trim()) {
      setError('Name and roll number are required')
      return
    }
    if (!form.id && !form.email.trim()) {
      setError('Email is required')
      return
    }

    if (!form.id && form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const payload: any = {
      name: form.name.trim(),
      rollNumber: form.rollNumber.trim(),
      classId: form.classId || null,
      hostelId: form.hostelId || null,
    }

    if (!form.id) {
      payload.email = form.email.trim()
      payload.password = form.password
      const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok || !data?.ok) {
        showToast(data?.error ?? 'Failed to add student', 'error')
        return
      }
      showToast('Student added successfully', 'success')
    } else {
      const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
        `/api/students/${form.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok || !data?.ok) {
        showToast(data?.error ?? 'Failed to update student', 'error')
        return
      }
      showToast('Student updated', 'success')
    }

    setIsOpen(false)
    setForm(emptyForm)
    cache.invalidate('/api/students')
    refreshStudents()
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this student? This cannot be undone.')) return
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(`/api/students/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok || !data?.ok) {
      showToast(data?.error ?? 'Failed to delete student', 'error')
      return
    }
    showToast('Student deleted', 'info')
    cache.invalidate('/api/students')
    refreshStudents()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Students
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
            Add Student
          </button>
        </div>
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'rollNumber', label: 'Roll No' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'class', label: 'Class', render: (item: Student) => item.class?.name ?? '-' },
          { key: 'hostel', label: 'Hostel', render: (item: Student) => item.hostel?.name ?? '-' },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Student) => (
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
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        data={students}
        emptyMessage="No students added yet."
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={form.id ? 'Edit Student' : 'Add Student'}
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
          <input
            placeholder="Roll Number"
            value={form.rollNumber}
            onChange={(event) => setForm({ ...form, rollNumber: event.target.value })}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
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
            {form.id ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
    </div>
  )
}
