import 'dotenv/config'
import prisma from '../lib/prisma'
import { hashPassword } from '../lib/auth/password'

const COLLEGE_NAME = process.env.DEMO_COLLEGE_NAME ?? 'Demo College'
const COLLEGE_LOCATION = process.env.DEMO_COLLEGE_LOCATION ?? 'Demo City'

const superEmailFromList = process.env.SUPER_ADMIN_EMAILS?.split(/[,\s]+/)[0]?.trim()
const SUPER_EMAIL =
  superEmailFromList || process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com'
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? '12345@12345'
const SUPER_NAME = process.env.SUPER_ADMIN_NAME ?? 'Super Admin'

const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? '12345@12345'
const ADMIN_NAME = process.env.DEMO_ADMIN_NAME ?? 'Admin User'

const ROLE_NAME = process.env.DEMO_ROLE_NAME ?? 'Faculty Reviewer'

const MEMBER_EMAIL = process.env.DEMO_MEMBER_EMAIL ?? 'faculty1@example.com'
const MEMBER_PASSWORD = process.env.DEMO_MEMBER_PASSWORD ?? '12345@12345'
const MEMBER_NAME = process.env.DEMO_MEMBER_NAME ?? 'Faculty Member'

const STUDENT_EMAIL = process.env.DEMO_STUDENT_EMAIL ?? 'student1@example.com'
const STUDENT_PASSWORD = process.env.DEMO_STUDENT_PASSWORD ?? '12345@12345'
const STUDENT_NAME = process.env.DEMO_STUDENT_NAME ?? 'Demo Student'

async function main() {
  if (process.env.USE_UNPOOLED === '1' && process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
  }

  const college =
    (await prisma.college.findFirst({ where: { name: COLLEGE_NAME } })) ??
    (await prisma.college.create({
      data: { name: COLLEGE_NAME, location: COLLEGE_LOCATION },
    }))

  const superHashed = await hashPassword(SUPER_PASSWORD)
  const adminHashed = await hashPassword(ADMIN_PASSWORD)
  const memberHashed = await hashPassword(MEMBER_PASSWORD)
  const studentHashed = await hashPassword(STUDENT_PASSWORD)

  const existingSuper = await prisma.admin.findUnique({ where: { email: SUPER_EMAIL } })
  if (existingSuper) {
    await prisma.admin.update({
      where: { email: SUPER_EMAIL },
      data: { name: SUPER_NAME, password: superHashed, collegeId: college.id },
    })
  } else {
    await prisma.admin.create({
      data: {
        name: SUPER_NAME,
        email: SUPER_EMAIL,
        password: superHashed,
        collegeId: college.id,
      },
    })
  }

  const admin =
    (await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } })) ??
    (await prisma.admin.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: adminHashed,
        collegeId: college.id,
      },
    }))

  if (admin.collegeId !== college.id || admin.name !== ADMIN_NAME) {
    await prisma.admin.update({
      where: { email: ADMIN_EMAIL },
      data: { name: ADMIN_NAME, password: adminHashed, collegeId: college.id },
    })
  }

  const role =
    (await prisma.role.findFirst({ where: { name: ROLE_NAME, collegeId: college.id } })) ??
    (await prisma.role.create({ data: { name: ROLE_NAME, collegeId: college.id } }))

  const modules = ['students', 'leaves', 'complaints', 'announcements'] as const
  for (const module of modules) {
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: role.id, module } },
      update: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: module === 'leaves',
      },
      create: {
        roleId: role.id,
        module,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: module === 'leaves',
      },
    })
  }

  const member =
    (await prisma.adminMember.findUnique({ where: { email: MEMBER_EMAIL } })) ??
    (await prisma.adminMember.create({
      data: {
        name: MEMBER_NAME,
        email: MEMBER_EMAIL,
        password: memberHashed,
        roleId: role.id,
        collegeId: college.id,
      },
    }))

  if (member.roleId !== role.id || member.collegeId !== college.id || member.name !== MEMBER_NAME) {
    await prisma.adminMember.update({
      where: { email: MEMBER_EMAIL },
      data: { name: MEMBER_NAME, password: memberHashed, roleId: role.id, collegeId: college.id },
    })
  }

  const student =
    (await prisma.student.findUnique({ where: { email: STUDENT_EMAIL } })) ??
    (await prisma.student.create({
      data: {
        name: STUDENT_NAME,
        email: STUDENT_EMAIL,
        password: studentHashed,
        rollNumber: '22CS001',
        phoneNumber: '+911234567890',
        department: 'CSE',
        year: '3',
        roomNumber: 'A-101',
        bedNumber: '1',
        gender: 'MALE',
        parentName: 'Parent Name',
        parentContact: '+911234567891',
        status: 'ACTIVE',
        profileImage: null,
        address: 'Demo Address',
        dateOfBirth: new Date('2004-01-01'),
        emergencyContactName: 'Guardian',
        emergencyContactNumber: '+911234567892',
        bloodGroup: 'O+',
        checkInDate: new Date('2024-06-01'),
        checkOutDate: null,
        feeStatus: 'PAID',
        passOutYear: 2026,
        inYear: 3,
        idCardPdf: null,
        collegeId: college.id,
      },
    }))

  if (student.collegeId !== college.id || student.name !== STUDENT_NAME) {
    await prisma.student.update({
      where: { email: STUDENT_EMAIL },
      data: { name: STUDENT_NAME, password: studentHashed, collegeId: college.id },
    })
  }

  await prisma.studentFaculty.upsert({
    where: { studentId_memberId: { studentId: student.id, memberId: member.id } },
    update: {},
    create: { studentId: student.id, memberId: member.id },
  })

  const fromDate = new Date()
  const toDate = new Date(fromDate)
  toDate.setDate(fromDate.getDate() + 1)
  const totalDays = 2

  const existingLeave = await prisma.leave.findFirst({
    where: { studentId: student.id, title: 'Medical Leave', fromDate },
  })
  if (!existingLeave) {
    await prisma.leave.create({
      data: {
        studentId: student.id,
        collegeId: college.id,
        leaveType: 'SICK',
        title: 'Medical Leave',
        reason: 'Fever and doctor visit',
        fromDate,
        toDate,
        totalDays,
        documentUrl: null,
        status: 'PENDING',
        assignedToId: member.id,
      },
    })
  }

  const existingComplaint = await prisma.complaint.findFirst({
    where: { studentId: student.id, title: 'Room Maintenance' },
  })
  if (!existingComplaint) {
    await prisma.complaint.create({
      data: {
        studentId: student.id,
        title: 'Room Maintenance',
        description: 'Fan not working properly.',
        status: 'PENDING',
        assignedToId: member.id,
      },
    })
  }

  console.log('Full demo setup complete')
  console.log(`College: ${college.name} (${college.id})`)
  console.log(`Super admin: ${SUPER_EMAIL}`)
  console.log(`Admin: ${ADMIN_EMAIL}`)
  console.log(`Role: ${ROLE_NAME}`)
  console.log(`Member: ${MEMBER_EMAIL}`)
  console.log(`Student: ${STUDENT_EMAIL}`)
}

main()
  .catch((err) => {
    console.error('Failed to create full setup')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
