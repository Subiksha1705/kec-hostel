import prisma from '@/lib/prisma'

type Action = 'canView' | 'canCreate' | 'canEdit' | 'canDelete'

export const MODULES = ['students', 'leaves', 'complaints', 'reviews'] as const
export type Module = (typeof MODULES)[number]

/**
 * Checks if a role has permission to perform an action on a module.
 * Throws 'FORBIDDEN' if not.
 * ADMINs bypass this check — call only for MEMBER type users.
 */
export async function requirePermission(
  roleId: string,
  module: Module | string,
  action: Action
): Promise<void> {
  const permission = await prisma.rolePermission.findUnique({
    where: { roleId_module: { roleId, module } },
  })

  if (!permission || !permission[action]) {
    throw new Error('FORBIDDEN')
  }
}

/**
 * Load all permissions for a role in one query.
 * Use this when you need to check multiple modules in the same request.
 */
export async function loadPermissions(
  roleId: string
): Promise<Map<string, Record<Action, boolean>>> {
  const rows = await prisma.rolePermission.findMany({ where: { roleId } })
  const map = new Map<string, Record<Action, boolean>>()
  for (const row of rows) {
    map.set(row.module, {
      canView: row.canView,
      canCreate: row.canCreate,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
    })
  }
  return map
}

export function checkPermission(
  permissions: Map<string, Record<Action, boolean>>,
  module: string,
  action: Action
): boolean {
  const perm = permissions.get(module)
  return !!(perm && perm[action])
}
