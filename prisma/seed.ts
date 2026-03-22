import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const college = await prisma.college.upsert({
    where: { id: 'seed-college-id' },
    update: {},
    create: {
      id: 'seed-college-id',
      name: 'KEC College',
      location: 'Coimbatore',
    },
  })

  const adminPassword = await bcrypt.hash('admin@123', 12)
  await prisma.admin.upsert({
    where: { email: 'admin@kec.ac.in' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@kec.ac.in',
      password: adminPassword,
      collegeId: college.id,
    },
  })

  const role = await prisma.role.upsert({
    where: { id: 'seed-role-id' },
    update: {},
    create: {
      id: 'seed-role-id',
      name: 'Class Advisor',
      collegeId: college.id,
    },
  })

  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: role.id, module: 'students' } },
    update: {},
    create: { roleId: role.id, module: 'students', canView: true },
  })

  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: role.id, module: 'leaves' } },
    update: {},
    create: { roleId: role.id, module: 'leaves', canView: true, canCreate: true },
  })

  const memberPassword = await bcrypt.hash('member@123', 12)
  await prisma.adminMember.upsert({
    where: { email: 'advisor@kec.ac.in' },
    update: {},
    create: {
      name: 'Class Advisor',
      email: 'advisor@kec.ac.in',
      password: memberPassword,
      roleId: role.id,
      collegeId: college.id,
    },
  })

  const studentPassword = await bcrypt.hash('student@123', 12)
  const student = await prisma.student.upsert({
    where: { email: 'student@kec.ac.in' },
    update: {},
    create: {
      name: 'Test Student',
      email: 'student@kec.ac.in',
      password: studentPassword,
      rollNumber: '21CS001',
      collegeId: college.id,
    },
  })

  await prisma.leave.create({
    data: {
      studentId: student.id,
      reason: 'Medical appointment',
      fromDate: new Date('2025-02-01'),
      toDate: new Date('2025-02-02'),
      status: 'PENDING',
      collegeId: college.id,
    },
  })

  console.log('Seed complete')
  console.log('Admin:   admin@kec.ac.in / admin@123')
  console.log('Member:  advisor@kec.ac.in / member@123')
  console.log('Student: student@kec.ac.in / student@123')
}

main().finally(() => prisma.$disconnect())
