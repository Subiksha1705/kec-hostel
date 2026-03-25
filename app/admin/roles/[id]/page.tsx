'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiJson } from '@/lib/api/client'
import Toast from '@/components/ui/Toast'

const modules = ['students', 'leaves', 'complaints'] as const

type Permission = {
  module: (typeof modules)[number]
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
}

export default function RolePermissionsPage() {
  const params = useParams<{ id: string }>()
  const roleId = params.id
  const [roleName, setRoleName] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await apiJson<{
        ok: boolean
        data: { id: string; name: string; permissions: Permission[] }
      }>(`/api/roles/${roleId}`)

      if (!data?.ok) {
        setLoading(false)
        return
      }

      setRoleName(data.data.name)

      const perms = data.data.permissions ?? []
      const merged = modules.map((module) => {
        const existing = perms.find((perm) => perm.module === module)
        return (
          existing ?? {
            module,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canApprove: false,
          }
        )
      })
      const normalized = merged.map((perm) => ({
        ...perm,
        canView: Boolean(perm.canView),
        canCreate: Boolean(perm.canCreate),
        canEdit: Boolean(perm.canEdit),
        canDelete: Boolean(perm.canDelete),
        canApprove: Boolean((perm as Permission).canApprove),
      }))
      setPermissions(normalized)
      setLoading(false)
    }

    load()
  }, [roleId])

  const updatePermission = (module: Permission['module'], key: keyof Permission, value: boolean) => {
    setPermissions((prev) =>
      prev.map((perm) => {
        if (perm.module !== module) return perm
        const next = { ...perm, [key]: value }
        if (key !== 'canView' && value) {
          next.canView = true
        }
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
    setPermissions((prev) =>
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
    setPermissions((prev) =>
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
    setPermissions((prev) =>
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

  const save = async () => {
    const payload = permissions.map((perm) => ({
      ...perm,
      canCreate: perm.canView ? perm.canCreate : false,
      canEdit: perm.canView ? perm.canEdit : false,
      canDelete: perm.canView ? perm.canDelete : false,
      canApprove: perm.canView ? Boolean(perm.canApprove) : false,
    }))

    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(`/api/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setToast('Permissions saved successfully')
      setToastVariant('success')
    } else {
      setToast(data?.error ?? 'Failed to save permissions')
      setToastVariant('error')
    }
  }

  const heading = useMemo(() => `${roleName} Permissions`, [roleName])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Link href="/admin/roles" style={{ color: 'var(--sage-dark)', textDecoration: 'none' }}>
        ← Back to roles
      </Link>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
        {heading}
      </h1>

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        {loading && (
          <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Loading permissions...
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Module</th>
              <th style={{ textAlign: 'center', padding: '12px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <span>All</span>
                  <input
                    type="checkbox"
                    checked={permissions.every(
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
              {['View', 'Create', 'Edit', 'Delete', 'Approve'].map((label) => (
                <th key={label} style={{ textAlign: 'center', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                    {label === 'Approve' ? (
                      <span title="Can approve/reject leave requests">Approve</span>
                    ) : (
                      label
                    )}
                    <input
                      type="checkbox"
                      checked={permissions.every((perm) =>
                        label === 'Approve'
                          ? perm.module === 'leaves'
                            ? perm.canApprove
                            : true
                          : label === 'View'
                            ? perm.canView
                            : label === 'Create'
                              ? perm.canCreate
                              : label === 'Edit'
                                ? perm.canEdit
                                : perm.canDelete
                      )}
                      onChange={(event) =>
                        toggleColumnAll(
                          label === 'Approve'
                            ? 'canApprove'
                            : label === 'View'
                              ? 'canView'
                              : label === 'Create'
                                ? 'canCreate'
                                : label === 'Edit'
                                  ? 'canEdit'
                                  : 'canDelete',
                          event.target.checked
                        )
                      }
                      style={{ accentColor: 'var(--sage)', cursor: 'pointer' }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm, index) => (
              <tr
                key={perm.module}
                onDoubleClick={() => toggleRowAll(perm.module, true)}
                style={{ background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
              >
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{perm.module}</td>
                <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                  <input
                    type="checkbox"
                    checked={
                      perm.canView &&
                      perm.canCreate &&
                      perm.canEdit &&
                      perm.canDelete &&
                      (perm.module !== 'leaves' || perm.canApprove)
                    }
                    onChange={(event) => toggleRowAll(perm.module, event.target.checked)}
                    style={{ accentColor: 'var(--sage)', cursor: 'pointer' }}
                  />
                </td>
                {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((key) => {
                  const disabled =
                    (key !== 'canView' && !perm.canView) ||
                    (key === 'canApprove' && perm.module !== 'leaves')
                  return (
                    <td key={key} style={{ textAlign: 'center', padding: '12px 16px' }}>
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

      <button
        onClick={save}
        disabled={loading}
        style={{
          alignSelf: 'flex-start',
          background: loading ? 'var(--surface-2)' : 'var(--sage)',
          color: loading ? 'var(--text-muted)' : 'white',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        Save Permissions
      </button>

      {toast ? <Toast message={toast} variant={toastVariant} onClose={() => setToast('')} /> : null}
    </div>
  )
}
