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
}

type Option = { id: string; name: string }

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
}

const toDateInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function StudentsPage() {
  const { data: studentsData, loading: studentsLoading, refresh: refreshStudents, fetchedAt } =
    useCachedFetch<Student[]>('/api/students')
  const { data: classesData, loading: classesLoading, refresh: refreshClasses } =
    useCachedFetch<Option[]>('/api/classes')
  const { data: hostelsData, loading: hostelsLoading, refresh: refreshHostels } =
    useCachedFetch<Option[]>('/api/hostels')
  const students = studentsData ?? []
  const classes = classesData ?? []
  const hostels = hostelsData ?? []
  const loading = studentsLoading || classesLoading || hostelsLoading
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [addMode, setAddMode] = useState<'manual' | 'bulk'>('manual')
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkResults, setBulkResults] = useState<null | { created: number; skipped: number; results: any[] }>(null)
  const [bulkError, setBulkError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast, showToast, clearToast } = useToast()
  const handleRefresh = async () => {
    await Promise.all([refreshStudents(), refreshClasses(), refreshHostels()])
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

  const openEdit = (student: Student) => {
    setAddMode('manual')
    setBulkFile(null)
    setBulkResults(null)
    setBulkError('')
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

    const getValue = (row: any, keys: string[]) => {
      for (const key of keys) {
        const value = row[key]
        if (value !== undefined && value !== null && value !== '') return value
      }
      return ''
    }

    const normalized = rows.map((row: any) => ({
      name: getValue(row, ['name', 'Name', 'NAME']),
      email: getValue(row, ['email', 'Email', 'EMAIL']),
      password: String(getValue(row, ['password', 'Password', 'PASSWORD'])),
      rollNumber: getValue(row, ['rollNumber', 'RollNumber', 'ROLLNUMBER', 'Roll Number', 'ROLL NUMBER', 'roll_no', 'ROLL_NO']),
      phoneNumber: getValue(row, ['phoneNumber', 'PhoneNumber', 'PHONENUMBER', 'Phone Number', 'PHONE NUMBER']),
      department: getValue(row, ['department', 'Department', 'DEPARTMENT']),
      year: getValue(row, ['year', 'Year', 'YEAR']),
      roomNumber: getValue(row, ['roomNumber', 'RoomNumber', 'ROOMNUMBER', 'Room Number', 'ROOM NUMBER']),
      bedNumber: getValue(row, ['bedNumber', 'BedNumber', 'BEDNUMBER', 'Bed Number', 'BED NUMBER']),
      gender: getValue(row, ['gender', 'Gender', 'GENDER']),
      parentName: getValue(row, ['parentName', 'ParentName', 'PARENTNAME', 'Parent Name', 'PARENT NAME']),
      parentContact: getValue(row, ['parentContact', 'ParentContact', 'PARENTCONTACT', 'Parent Contact', 'PARENT CONTACT']),
      status: getValue(row, ['status', 'Status', 'STATUS']),
      profileImage: getValue(row, ['profileImage', 'ProfileImage', 'PROFILEIMAGE', 'Profile Image', 'PROFILE IMAGE']),
      address: getValue(row, ['address', 'Address', 'ADDRESS']),
      dateOfBirth: getValue(row, ['dateOfBirth', 'DateOfBirth', 'DATEOFBIRTH', 'Date of Birth', 'DATE OF BIRTH']),
      emergencyContactName: getValue(row, ['emergencyContactName', 'EmergencyContactName', 'Emergency Contact Name']),
      emergencyContactNumber: getValue(row, ['emergencyContactNumber', 'EmergencyContactNumber', 'Emergency Contact Number']),
      bloodGroup: getValue(row, ['bloodGroup', 'BloodGroup', 'Blood Group']),
      checkInDate: getValue(row, ['checkInDate', 'CheckInDate', 'Check In Date', 'Check-in Date']),
      checkOutDate: getValue(row, ['checkOutDate', 'CheckOutDate', 'Check Out Date', 'Check-out Date']),
      feeStatus: getValue(row, ['feeStatus', 'FeeStatus', 'Fee Status']),
      passOutYear: getValue(row, ['passOutYear', 'PassOutYear', 'Pass Out Year']),
      inYear: getValue(row, ['inYear', 'InYear', 'In Year']),
      idCardPdf: getValue(row, ['idCardPdf', 'IdCardPdf', 'IDCardPdf', 'ID Card PDF', 'ID Card Pdf']),
      class: getValue(row, ['class', 'Class', 'CLASS', 'className', 'Class Name']),
      classId: getValue(row, ['classId', 'ClassId', 'CLASSID', 'class_id']),
      hostel: getValue(row, ['hostel', 'Hostel', 'HOSTEL', 'hostelName', 'Hostel Name']),
      hostelId: getValue(row, ['hostelId', 'HostelId', 'HOSTELID', 'hostel_id']),
    }))

    const { res, data } = await apiJson<{ ok: boolean; data?: typeof bulkResults; error?: string }>(
      '/api/students/bulk',
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
      showToast(`${data.data.created} students created, ${data.data.skipped} skipped`, 'success')
    }
    cache.invalidate('/api/students')
    refreshStudents()
  }

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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with columns:
                <br />
                <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                  name, email, password, rollNumber, phoneNumber, department, year, gender, parentName, parentContact,
                  status, profileImage, address, dateOfBirth, emergencyContactName, emergencyContactNumber, bloodGroup,
                  checkInDate, checkOutDate, feeStatus, passOutYear, inYear, idCardPdf, class, hostel
                </code>
                <br />
                Phone numbers must include country code (example: <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>+91XXXXXXXXXX</code>).
                Names must contain letters only.
                <br />
                Optional columns: <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>roomNumber</code>
                , <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>bedNumber</code>
                , <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>classId</code>,{' '}
                <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>hostelId</code>.
                Use <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>class</code>/
                <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>hostel</code> to match by name.
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
                Upload & Create Students
              </button>
            </div>
          )}
        </div>
      </Modal>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
    </div>
  )
}
