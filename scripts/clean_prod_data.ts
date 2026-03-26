import 'dotenv/config'

import prisma from '../lib/prisma'

function parseSuperEmails() {
  const rawList = process.env.SUPER_ADMIN_EMAILS
  const single = process.env.SUPER_ADMIN_EMAIL
  const list = (rawList ? rawList.split(/[,\s]+/) : [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  if (single) list.push(single.toLowerCase())
  return Array.from(new Set(list))
}

async function main() {
  if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
  }

  if (process.env.CONFIRM_CLEAN !== '1') {
    console.error('Refusing to clean data. Set CONFIRM_CLEAN=1 to proceed.')
    process.exit(1)
  }

  const superEmails = parseSuperEmails()
  if (superEmails.length === 0 && process.env.ALLOW_EMPTY_SUPER !== '1') {
    console.error(
      'No SUPER_ADMIN_EMAIL(S) configured. Set SUPER_ADMIN_EMAIL(S) or ALLOW_EMPTY_SUPER=1.'
    )
    process.exit(1)
  }

  const keepAdmins = superEmails.length
    ? await prisma.admin.findMany({ where: { email: { in: superEmails } } })
    : []
  const keepCollegeIds = Array.from(new Set(keepAdmins.map((admin) => admin.collegeId)))

  // Avoid interactive transactions because some providers (pgbouncer)
  // can close transactions mid-flight.
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

  if (superEmails.length) {
    await prisma.admin.deleteMany({ where: { email: { notIn: superEmails } } })
    if (keepCollegeIds.length) {
      await prisma.college.deleteMany({ where: { id: { notIn: keepCollegeIds } } })
    }
  } else {
    await prisma.admin.deleteMany()
    await prisma.college.deleteMany()
  }

  console.log('Production data cleaned')
  if (superEmails.length) {
    console.log(`Kept super admins: ${superEmails.join(', ')}`)
  } else {
    console.log('No super admins kept')
  }
}

main()
  .catch((err) => {
    console.error('Failed to clean production data')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
