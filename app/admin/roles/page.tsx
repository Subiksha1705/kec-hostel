'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiJson } from '@/lib/api/client'
import Modal from '@/components/ui/Modal'

type Role = {
  id: string
  name: string
  permissions: { module: string; canView: boolean }[]
  _count: { members: number }
}

export default function RolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await apiJson<{ ok: boolean; data: Role[] }>('/api/roles')
    if (data?.ok) setRoles(data.data)
  }

  useEffect(() => {
    load()
  }, [])

  const createRole = async () => {
    setError('')
    if (!newRoleName.trim()) {
      setError('Role name is required')
      return
    }
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/roles', {
      method: 'POST',
      body: JSON.stringify({ name: newRoleName.trim() }),
    })
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to create role')
      return
    }
    setNewRoleName('')
    setIsOpen(false)
    load()
  }

  const deleteRole = async (roleId: string) => {
    await apiJson(`/api/roles/${roleId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Roles
        </h1>
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
          New Role
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {roles.map((role) => {
          const permissionLabels = role.permissions
            .filter((perm) => perm.canView)
            .map((perm) => perm.module)

          return (
            <div
              key={role.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
                  fontSize: '20px',
                }}
              >
                {role.name}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {role._count.members} members
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {permissionLabels.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No permissions</span>
                ) : (
                  permissionLabels.map((label) => (
                    <span
                      key={label}
                      style={{
                        background: 'var(--sage-light)',
                        color: 'var(--sage-dark)',
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '12px',
                      }}
                    >
                      {label}
                    </span>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => router.push(`/admin/roles/${role.id}`)}
                  style={{
                    flex: 1,
                    background: 'var(--sage-light)',
                    color: 'var(--sage-dark)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                >
                  Edit Permissions
                </button>
                <button
                  onClick={() => deleteRole(role.id)}
                  disabled={role._count.members > 0}
                  style={{
                    flex: 1,
                    background: role._count.members > 0 ? 'var(--surface-2)' : 'var(--rose)',
                    color: role._count.members > 0 ? 'var(--text-muted)' : '#7a2020',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius)',
                    cursor: role._count.members > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Role">
        <div style={{ display: 'grid', gap: '10px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Role Name</label>
          <input
            value={newRoleName}
            onChange={(event) => setNewRoleName(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          />
          {error ? (
            <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '8px 10px', borderRadius: 'var(--radius)' }}>
              {error}
            </div>
          ) : null}
          <button
            onClick={createRole}
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
            Create Role
          </button>
        </div>
      </Modal>
    </div>
  )
}
