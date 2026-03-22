'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import Table from '@/components/ui/Table'

type Student = {
  id: string
  name: string
  email: string
  rollNumber: string
  class?: { name: string } | null
  hostel?: { name: string } | null
}

export default function MemberStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    apiJson<{ ok: boolean; data: Student[] }>('/api/students').then(({ data }) => {
      if (data?.ok) setStudents(data.data)
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
        Students
      </h1>

      <Table
        columns={[
          { key: 'rollNumber', label: 'Roll No' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'class', label: 'Class', render: (item: Student) => item.class?.name ?? '-' },
          { key: 'hostel', label: 'Hostel', render: (item: Student) => item.hostel?.name ?? '-' },
        ]}
        data={students}
        emptyMessage="No students available."
      />
    </div>
  )
}
