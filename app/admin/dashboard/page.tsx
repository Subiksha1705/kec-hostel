'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Shield, GraduationCap, CalendarCheck } from 'lucide-react'
import { apiJson } from '@/lib/api/client'
import StatCard from '@/components/ui/StatCard'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  student: { name: string }
  assignedTo?: { name: string } | null
}

type DashboardData = {
  stats: { students: number; members: number; roles: number; pending: number }
  recentLeaves: Leave[]
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiJson<{ ok: boolean; data: DashboardData }>('/api/dashboard').then(({ data: res }) => {
      if (res?.ok) setData(res.data)
      setLoading(false)
    })
  }, [])

  const stats = data?.stats ?? { students: 0, members: 0, roles: 0, pending: 0 }
  const recentLeaves = data?.recentLeaves ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {loading && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 0' }}>
          Loading...
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Total Students" value={stats.students} icon={<GraduationCap size={20} />} />
        <StatCard label="Total Members" value={stats.members} icon={<Users size={20} />} />
        <StatCard label="Total Roles" value={stats.roles} icon={<Shield size={20} />} />
        <StatCard label="Pending Leaves" value={stats.pending} icon={<CalendarCheck size={20} />} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Recent Leaves
        </h2>
        <Link href="/admin/leaves" style={{ color: 'var(--sage-dark)', textDecoration: 'none' }}>
          View all →
        </Link>
      </div>

      <Table
        columns={[
          { key: 'student', label: 'Student Name', render: (item: Leave) => item.student?.name ?? '-' },
          { key: 'reason', label: 'Reason' },
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          { key: 'assignedTo', label: 'Assigned To', render: (item: Leave) => item.assignedTo?.name ?? 'Unassigned' },
        ]}
        data={recentLeaves}
        emptyMessage="No leave requests yet."
      />
    </div>
  )
}
