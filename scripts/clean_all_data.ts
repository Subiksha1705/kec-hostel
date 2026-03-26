import 'dotenv/config'

import prisma from '../lib/prisma'

async function main() {
  if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
  }

  if (process.env.CONFIRM_CLEAN !== '1') {
    console.error('Refusing to clean data. Set CONFIRM_CLEAN=1 to proceed.')
    process.exit(1)
  }

  if (process.env.ALLOW_DELETE_SUPER !== 'YES') {
    console.error('Refusing to delete super admins. Set ALLOW_DELETE_SUPER=YES to proceed.')
    process.exit(1)
  }

  await prisma.studentFaculty.deleteMany()
  await prisma.leave.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.review.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.gallery.deleteMany()
  await prisma.adminMember.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.student.deleteMany()
  await prisma.class.deleteMany()
  await prisma.hostel.deleteMany()
  await prisma.chatbotKnowledgeSource.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.college.deleteMany()

  console.log('All data deleted (including super admins)')
}

main()
  .catch((err) => {
    console.error('Failed to clean all data')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
