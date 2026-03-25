'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
import Modal from '@/components/ui/Modal'

type Role = {
  id: string
  name: string
  permissions: { module: string; canView: boolean }[]
  _count: { members: number }
}

const modules = ['students', 'leaves', 'complaints'] as const

type Permission = {
  module: (typeof modules)[number]
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
}

const emptyPermissions: Permission[] = modules.map((module) => ({
  module,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
}))

export default function RolesPage() {
  const router = useRouter()
  const { data, loading, refresh, fetchedAt } = useCachedFetch<Role[]>('/api/roles')
  const roles = data ?? []
  const [isOpen, setIsOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [error, setError] = useState('')
  const [newPermissions, setNewPermissions] = useState<Permission[]>(emptyPermissions)

  const createRole = async () => {
    setError('')
    if (!newRoleName.trim()) {
      setError('Role name is required')
      return
    }
    const { res, data } = await apiJson<{ ok: boolean; error?: string; data?: { id: string } }>('/api/roles', {
      method: 'POST',
      body: JSON.stringify({ name: newRoleName.trim() }),
    })
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to create role')
      return
    }
    const roleId = data.data?.id as string
    const payload = newPermissions.map((perm) => ({
      ...perm,
      canCreate: perm.canView ? perm.canCreate : false,
      canEdit: perm.canView ? perm.canEdit : false,
      canDelete: perm.canView ? perm.canDelete : false,
      canApprove: perm.canView ? Boolean(perm.canApprove) : false,
    }))
    const permissionsRes = await apiJson<{ ok: boolean; error?: string }>(
      `/api/roles/${roleId}/permissions`,
      { method: 'PUT', body: JSON.stringify(payload) }
    )
    if (!permissionsRes.res.ok || !permissionsRes.data?.ok) {
      setError(permissionsRes.data?.error ?? 'Role created, but failed to save permissions')
      return
    }
    setNewRoleName('')
    setNewPermissions(emptyPermissions)
    setIsOpen(false)
    cache.invalidate('/api/roles')
    refresh()
  }

  const updatePermission = (module: Permission['module'], key: keyof Permission, value: boolean) => {
    setNewPermissions((prev) =>
      prev.map((perm) => {
        if (perm.module !== module) return perm
        const next = { ...perm, [key]: value }
        if (key !== 'canView' && value) next.canView = true
        if (key === 'canView' && !value) {
          next.canCreate = false
          next.canEdit = false
          next.canDelete = false
          next.canApprove = false
        }
        if (key === 'canApprove' && perm.module !== 'leaves') {
          next.canApprove = false
        }
        return next
      })
    )
  }

  const toggleRowAll = (module: Permission['module'], value: boolean) => {
    setNewPermissions((prev) =>
      prev.map((perm) => {
        if (perm.module !== module) return perm
        return {
          ...perm,
          canView: value,
          canCreate: value,
          canEdit: value,
          canDelete: value,
          canApprove: perm.module === 'leaves' ? value : false,
        }
      })
    )
  }

  const toggleAll = (value: boolean) => {
    setNewPermissions((prev) =>
      prev.map((perm) => ({
        ...perm,
        canView: value,
        canCreate: value,
        canEdit: value,
        canDelete: value,
        canApprove: perm.module === 'leaves' ? value : false,
      }))
    )
  }

  const toggleColumnAll = (key: keyof Permission, value: boolean) => {
    setNewPermissions((prev) =>
      prev.map((perm) => {
        if (key === 'canApprove' && perm.module !== 'leaves') return perm
        const next = { ...perm, [key]: value }
        if (key !== 'canView' && value) next.canView = true
        if (key === 'canView' && !value) {
          next.canCreate = false
          next.canEdit = false
          next.canDelete = false
          next.canApprove = false
        }
        return next
      })
    )
  }

  const deleteRole = async (roleId: string) => {
    await apiJson(`/api/roles/${roleId}`, { method: 'DELETE' })
    cache.invalidate('/api/roles')
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Roles
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
          <button
            onClick={() => {
              setNewRoleName('')
              setNewPermissions(emptyPermissions)
              setError('')
              setIsOpen(true)
            }}
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
      </div>

      {loading && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Loading...
        </div>
      )}

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
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Select permissions for this role.
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Module</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <span>All</span>
                      <input
                        type="checkbox"
                        checked={newPermissions.every(
                          (perm) =>
                            perm.canView &&
                            perm.canCreate &&
                            perm.canEdit &&
                            perm.canDelete &&
                            (perm.module !== 'leaves' || perm.canApprove)
                        )}
                        onChange={(event) => toggleAll(event.target.checked)}
                        style={{ accentColor: 'var(--sage)', cursor: 'pointer' }}
                      />
                    </div>
                  </th>
                  {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((key) => (
                    <th key={key} style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <span>{key === 'canView' ? 'View' : key === 'canCreate' ? 'Create' : key === 'canEdit' ? 'Edit' : key === 'canDelete' ? 'Delete' : 'Approve'}</span>
                        <input
                          type="checkbox"
                          checked={newPermissions.every((perm) =>
                            key === 'canApprove' ? (perm.module === 'leaves' ? perm.canApprove : true) : perm[key]
                          )}
                          onChange={(event) => toggleColumnAll(key, event.target.checked)}
                          style={{ accentColor: 'var(--sage)', cursor: 'pointer' }}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newPermissions.map((perm, index) => (
                  <tr
                    key={perm.module}
                    onDoubleClick={() => toggleRowAll(perm.module, true)}
                    style={{ background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
                  >
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{perm.module}</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={perm.canView && perm.canCreate && perm.canEdit && perm.canDelete && (perm.module !== 'leaves' || perm.canApprove)}
                        onChange={(event) => toggleRowAll(perm.module, event.target.checked)}
                        style={{ accentColor: 'var(--sage)', cursor: 'pointer' }}
                      />
                    </td>
                    {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((key) => {
                      const disabled =
                        (key !== 'canView' && !perm.canView) ||
                        (key === 'canApprove' && perm.module !== 'leaves')
                      return (
                        <td key={key} style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={perm[key]}
                            disabled={disabled}
                            onChange={(event) => updatePermission(perm.module, key, event.target.checked)}
                            style={{ accentColor: 'var(--sage)', cursor: disabled ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
