import prisma from '@/lib/prisma'

type Action = 'canView' | 'canCreate' | 'canEdit' | 'canDelete'

/**
 * Checks if a role has permission to perform an action on a module.
 * Throws 'FORBIDDEN' if not.
 * ADMINs bypass this check — call only for MEMBER type users.
 */
export async function requirePermission(
  roleId: string,
  module: string,
  action: Action
): Promise<void> {
  const permission = await prisma.rolePermission.findUnique({
    where: { roleId_module: { roleId, module } },
  })

  if (!permission || !permission[action]) {
    throw new Error('FORBIDDEN')
  }
}
