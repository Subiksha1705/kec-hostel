import 'dotenv/config'
import prisma from '../lib/prisma'
import { hashPassword } from '../lib/auth/password'

const COLLEGE_NAME = 'TestCollege'
const COLLEGE_LOCATION = 'TestLocation'
const SUPER_EMAIL = 'subiksha1704@gmail.com'
const SUPER_PASSWORD = '12345@12345'
const ADMIN_EMAIL = 'subiksharameshkanna@gmail.com'
const ADMIN_PASSWORD = '12345@12345'
const SUPER_NAME = 'Super Admin'
const ADMIN_NAME = 'Admin User'

async function main() {
  if (process.env.USE_UNPOOLED === '1' && process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
  }

  let college = await prisma.college.findFirst({ where: { name: COLLEGE_NAME } })
  if (!college) {
    college = await prisma.college.create({
      data: {
        name: COLLEGE_NAME,
        location: COLLEGE_LOCATION,
      },
    })
  }

  const superHashed = await hashPassword(SUPER_PASSWORD)
  const adminHashed = await hashPassword(ADMIN_PASSWORD)

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

  const existingAdmin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existingAdmin) {
    await prisma.admin.update({
      where: { email: ADMIN_EMAIL },
      data: { name: ADMIN_NAME, password: adminHashed, collegeId: college.id },
    })
  } else {
    await prisma.admin.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: adminHashed,
        collegeId: college.id,
      },
    })
  }

  console.log('Test setup complete')
  console.log(`College: ${college.name}`)
  console.log(`College ID: ${college.id}`)
  console.log(`Super admin email: ${SUPER_EMAIL}`)
  console.log(`Admin email: ${ADMIN_EMAIL}`)
}

main()
  .catch((err) => {
    console.error('Failed to create test setup')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
