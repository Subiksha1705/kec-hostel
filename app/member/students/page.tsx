'use client'

import { useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import PhoneInput from '@/components/ui/PhoneInput'
import Select from '@/components/ui/Select'

type Student = {
  id: string
  name: string
  email: string
  rollNumber: string
  phoneNumber: string
  department: string
  year: string
  roomNumber?: string | null
  bedNumber?: string | null
  gender: string
  parentName: string
  parentContact: string
  status: string
  profileImage: string
  address: string
  dateOfBirth: string
  emergencyContactName: string
  emergencyContactNumber: string
  bloodGroup: string
  checkInDate: string
  checkOutDate: string
  feeStatus: string
  passOutYear: number
  inYear: number
  idCardPdf: string
  class?: { id: string; name: string } | null
  hostel?: { id: string; name: string } | null
  facultyInCharge?: { member: { id: string; name: string; email: string } }[]
}

type Option = { id: string; name: string; email?: string }

type Permission = { module: string; canCreate: boolean; canEdit: boolean; canDelete: boolean }

type FormState = {
  id?: string
  name: string
  email: string
  password: string
  rollNumber: string
  phoneNumber: string
  department: string
  year: string
  roomNumber: string
  bedNumber: string
  gender: string
  parentName: string
  parentContact: string
  status: string
  profileImage: string
  address: string
  dateOfBirth: string
  emergencyContactName: string
  emergencyContactNumber: string
  bloodGroup: string
  checkInDate: string
  checkOutDate: string
  feeStatus: string
  passOutYear: string
  inYear: string
  idCardPdf: string
  classId: string
  hostelId: string
  facultyIds: string[]
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  rollNumber: '',
  phoneNumber: '',
  department: '',
  year: '',
  roomNumber: '',
  bedNumber: '',
  gender: '',
  parentName: '',
  parentContact: '',
  status: '',
  profileImage: '',
  address: '',
  dateOfBirth: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
  bloodGroup: '',
  checkInDate: '',
  checkOutDate: '',
  feeStatus: '',
  passOutYear: '',
  inYear: '',
  idCardPdf: '',
  classId: '',
  hostelId: '',
  facultyIds: [],
}

const toDateInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function MemberStudentsPage() {
  const { data: studentsData, loading: studentsLoading, refresh: refreshStudents, fetchedAt } =
    useCachedFetch<Student[]>('/api/students')
  const { data: classesData, loading: classesLoading, refresh: refreshClasses } =
    useCachedFetch<Option[]>('/api/classes')
  const { data: hostelsData, loading: hostelsLoading, refresh: refreshHostels } =
    useCachedFetch<Option[]>('/api/hostels')
  const { data: facultyData, loading: facultyLoading, refresh: refreshFaculty } =
    useCachedFetch<Option[]>('/api/faculty-options')
  const { data: permsData, loading: permsLoading, refresh: refreshPerms } =
    useCachedFetch<Permission[]>('/api/permissions')
  const students = studentsData ?? []
  const classes = classesData ?? []
  const hostels = hostelsData ?? []
  const facultyOptions = facultyData ?? []
  const perms = permsData ?? []
  const loading = studentsLoading || classesLoading || hostelsLoading || permsLoading || facultyLoading
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
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
  const studentPerm = useMemo(() => perms.find((p) => p.module === 'students'), [perms])
  const canCreate = studentPerm?.canCreate ?? false
  const canEdit = studentPerm?.canEdit ?? false
  const canDelete = studentPerm?.canDelete ?? false
  const { toast, showToast, clearToast } = useToast()
  const handleRefresh = async () => {
    await Promise.all([refreshStudents(), refreshClasses(), refreshHostels(), refreshPerms(), refreshFaculty()])
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
      phoneNumber: student.phoneNumber,
      department: student.department,
      year: student.year,
      roomNumber: student.roomNumber ?? '',
      bedNumber: student.bedNumber ?? '',
      gender: student.gender,
      parentName: student.parentName,
      parentContact: student.parentContact,
      status: student.status,
      profileImage: student.profileImage,
      address: student.address,
      dateOfBirth: toDateInput(student.dateOfBirth),
      emergencyContactName: student.emergencyContactName,
      emergencyContactNumber: student.emergencyContactNumber,
      bloodGroup: student.bloodGroup,
      checkInDate: toDateInput(student.checkInDate),
      checkOutDate: toDateInput(student.checkOutDate),
      feeStatus: student.feeStatus,
      passOutYear: String(student.passOutYear),
      inYear: String(student.inYear),
      idCardPdf: student.idCardPdf,
      classId: student.class?.id ?? '',
      hostelId: student.hostel?.id ?? '',
      facultyIds: student.facultyInCharge?.map((f) => f.member.id) ?? [],
    })
    setError('')
    setIsOpen(true)
  }

  const submit = async () => {
    setError('')
    const requiredFields = [
      { label: 'Name', value: form.name },
      { label: 'Roll number', value: form.rollNumber },
      { label: 'Phone number', value: form.phoneNumber },
      { label: 'Department', value: form.department },
      { label: 'Year', value: form.year },
      { label: 'Gender', value: form.gender },
      { label: 'Parent name', value: form.parentName },
      { label: 'Parent contact', value: form.parentContact },
      { label: 'Status', value: form.status },
      { label: 'Profile image', value: form.profileImage },
      { label: 'Address', value: form.address },
      { label: 'Date of birth', value: form.dateOfBirth },
      { label: 'Emergency contact name', value: form.emergencyContactName },
      { label: 'Emergency contact number', value: form.emergencyContactNumber },
      { label: 'Blood group', value: form.bloodGroup },
      { label: 'Check-in date', value: form.checkInDate },
      { label: 'Check-out date', value: form.checkOutDate },
      { label: 'Fee status', value: form.feeStatus },
      { label: 'Pass out year', value: form.passOutYear },
      { label: 'In year', value: form.inYear },
      { label: 'ID card PDF', value: form.idCardPdf },
      { label: 'Faculty in charge', value: form.facultyIds.length ? 'ok' : '' },
    ]
    const missing = requiredFields.find((field) => !field.value.trim())
    if (missing) {
      setError(`${missing.label} is required`)
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
      phoneNumber: form.phoneNumber.trim(),
      department: form.department.trim(),
      year: form.year.trim(),
      roomNumber: form.roomNumber.trim() || null,
      bedNumber: form.bedNumber.trim() || null,
      gender: form.gender.trim(),
      parentName: form.parentName.trim(),
      parentContact: form.parentContact.trim(),
      status: form.status.trim(),
      profileImage: form.profileImage.trim(),
      address: form.address.trim(),
      dateOfBirth: form.dateOfBirth,
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactNumber: form.emergencyContactNumber.trim(),
      bloodGroup: form.bloodGroup.trim(),
      checkInDate: form.checkInDate,
      checkOutDate: form.checkOutDate,
      feeStatus: form.feeStatus.trim(),
      passOutYear: Number(form.passOutYear),
      inYear: Number(form.inYear),
      idCardPdf: form.idCardPdf.trim(),
      classId: form.classId || null,
      hostelId: form.hostelId || null,
      facultyIds: form.facultyIds,
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
          {canCreate ? (
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
          ) : null}
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
            render: (item: Student) => {
              if (!canEdit && !canDelete) return <span style={{ color: 'var(--text-muted)' }}>—</span>
              return (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {canEdit ? (
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
                  ) : null}
                  {canDelete ? (
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
                  ) : null}
                </div>
              )
            },
          },
        ]}
        data={students}
        emptyMessage="No students available."
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={form.id ? 'Edit Student' : 'Add Student'}
      >
        <div style={{ display: 'grid', gap: '12px' }}>
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
            <span style={fieldLabelStyle}>Roll Number</span>
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
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Phone Number</span>
            <PhoneInput
              value={form.phoneNumber}
              onChange={(value) => setForm({ ...form, phoneNumber: value })}
              placeholder="Phone Number"
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Department</span>
            <input
              placeholder="Department"
              value={form.department}
              onChange={(event) => setForm({ ...form, department: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Year</span>
            <input
              placeholder="Year"
              value={form.year}
              onChange={(event) => setForm({ ...form, year: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>In Year</span>
            <input
              placeholder="In Year"
              type="number"
              value={form.inYear}
              onChange={(event) => setForm({ ...form, inYear: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Pass Out Year</span>
            <input
              placeholder="Pass Out Year"
              type="number"
              value={form.passOutYear}
              onChange={(event) => setForm({ ...form, passOutYear: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Gender</span>
            <input
              placeholder="Gender"
              value={form.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Parent Name</span>
            <input
              placeholder="Parent Name"
              value={form.parentName}
              onChange={(event) => setForm({ ...form, parentName: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Parent Contact</span>
            <PhoneInput
              value={form.parentContact}
              onChange={(value) => setForm({ ...form, parentContact: value })}
              placeholder="Parent Contact"
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Emergency Contact Name</span>
            <input
              placeholder="Emergency Contact Name"
              value={form.emergencyContactName}
              onChange={(event) => setForm({ ...form, emergencyContactName: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Emergency Contact Number</span>
            <PhoneInput
              value={form.emergencyContactNumber}
              onChange={(value) => setForm({ ...form, emergencyContactNumber: value })}
              placeholder="Emergency Contact Number"
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Blood Group</span>
            <input
              placeholder="Blood Group"
              value={form.bloodGroup}
              onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Status</span>
            <input
              placeholder="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Fee Status</span>
            <input
              placeholder="Fee Status"
              value={form.feeStatus}
              onChange={(event) => setForm({ ...form, feeStatus: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Profile Image URL</span>
            <input
              placeholder="Profile Image URL"
              value={form.profileImage}
              onChange={(event) => setForm({ ...form, profileImage: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>ID Card PDF URL</span>
            <input
              placeholder="ID Card PDF URL"
              value={form.idCardPdf}
              onChange={(event) => setForm({ ...form, idCardPdf: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Room Number (optional)</span>
            <input
              placeholder="Room Number (optional)"
              value={form.roomNumber}
              onChange={(event) => setForm({ ...form, roomNumber: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Bed Number (optional)</span>
            <input
              placeholder="Bed Number (optional)"
              value={form.bedNumber}
              onChange={(event) => setForm({ ...form, bedNumber: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Date of Birth</span>
            <input
              placeholder="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Check-in Date</span>
            <input
              placeholder="Check-in Date"
              type="date"
              value={form.checkInDate}
              onChange={(event) => setForm({ ...form, checkInDate: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Check-out Date</span>
            <input
              placeholder="Check-out Date"
              type="date"
              value={form.checkOutDate}
              onChange={(event) => setForm({ ...form, checkOutDate: event.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={{ ...fieldRowStyle, alignItems: 'start' }}>
            <span style={{ ...fieldLabelStyle, paddingTop: '8px' }}>Address</span>
            <textarea
              placeholder="Address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              rows={3}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Class</span>
            <Select
              value={form.classId}
              onChange={(value) => setForm({ ...form, classId: value })}
              options={[
                { value: '', label: 'No restriction (class)' },
                ...classes.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </label>
          <label style={fieldRowStyle}>
            <span style={fieldLabelStyle}>Hostel</span>
            <Select
              value={form.hostelId}
              onChange={(value) => setForm({ ...form, hostelId: value })}
              options={[
                { value: '', label: 'No restriction (hostel)' },
                ...hostels.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </label>
          <div style={{ display: 'grid', gap: '8px' }}>
            <span style={fieldLabelStyle}>Faculty In Charge</span>
            <div
              style={{
                display: 'grid',
                gap: '6px',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {facultyOptions.length ? (
                facultyOptions.map((member) => {
                  const checked = form.facultyIds.includes(member.id)
                  return (
                    <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setForm({ ...form, facultyIds: [...form.facultyIds, member.id] })
                          } else {
                            setForm({
                              ...form,
                              facultyIds: form.facultyIds.filter((id) => id !== member.id),
                            })
                          }
                        }}
                      />
                      <span style={{ fontSize: '14px' }}>
                        {member.name}
                        {member.email ? ` (${member.email})` : ''}
                      </span>
                    </label>
                  )
                })
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No faculty accounts available.
                </span>
              )}
            </div>
          </div>
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
            {form.id ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
    </div>
  )
}
