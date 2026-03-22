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
}

type Role = { id: string; name: string }

export default function RolePermissionsPage() {
  const params = useParams<{ id: string }>()
  const roleId = params.id
  const [roleName, setRoleName] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    const load = async () => {
      const [rolesRes, permsRes] = await Promise.all([
        apiJson<{ ok: boolean; data: Role[] }>('/api/roles'),
        apiJson<{ ok: boolean; data: Permission[] }>(`/api/roles/${roleId}/permissions`),
      ])

      const role = rolesRes.data?.data?.find((item) => item.id === roleId)
      setRoleName(role?.name ?? 'Role')

      const perms = permsRes.data?.data ?? []
      const merged = modules.map((module) => {
        const existing = perms.find((perm) => perm.module === module)
        return (
          existing ?? {
            module,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          }
        )
      })
      setPermissions(merged)
    }

    load()
  }, [roleId])

  const updatePermission = (module: Permission['module'], key: keyof Permission, value: boolean) => {
    setPermissions((prev) =>
      prev.map((perm) => {
        if (perm.module !== module) return perm
        const next = { ...perm, [key]: value }
        if (key === 'canView' && !value) {
          next.canCreate = false
          next.canEdit = false
          next.canDelete = false
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
    }))

    const { res } = await apiJson(`/api/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setToast('Permissions saved')
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Module</th>
              {['View', 'Create', 'Edit', 'Delete'].map((label) => (
                <th key={label} style={{ textAlign: 'center', padding: '12px 16px' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm, index) => (
              <tr
                key={perm.module}
                style={{ background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
              >
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{perm.module}</td>
                {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map((key) => {
                  const disabled = key !== 'canView' && !perm.canView
                  return (
                    <td key={key} style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={perm[key]}
                        disabled={disabled}
                        onChange={(event) => updatePermission(perm.module, key, event.target.checked)}
                        style={{ accentColor: 'var(--sage)' }}
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
        style={{
          alignSelf: 'flex-start',
          background: 'var(--sage)',
          color: 'white',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Save Permissions
      </button>

      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </div>
  )
}
