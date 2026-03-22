/**
 * Checks if a member's scope allows them to access a given student.
 *
 * Rules (from PRD):
 *   - classId set  → member can only see students in that class
 *   - hostelId set → member can only see students in that hostel
 *   - both null    → full access (all students in the college)
 *   - both set     → student must match both
 *
 * Throws 'SCOPE_DENIED' if access is not allowed.
 * ADMINs bypass this — call only for MEMBER type users.
 */
export function assertScope(
  member: { classId: string | null; hostelId: string | null },
  student: { classId: string | null; hostelId: string | null }
): void {
  if (member.classId && student.classId !== member.classId) {
    throw new Error('SCOPE_DENIED')
  }
  if (member.hostelId && student.hostelId !== member.hostelId) {
    throw new Error('SCOPE_DENIED')
  }
}

/**
 * Returns a Prisma `where` clause fragment that filters students
 * to only those visible to this member. Use in list queries.
 */
export function scopeFilter(member: {
  classId: string | null
  hostelId: string | null
  collegeId: string
}) {
  return {
    collegeId: member.collegeId,
    ...(member.classId ? { classId: member.classId } : {}),
    ...(member.hostelId ? { hostelId: member.hostelId } : {}),
  }
}
