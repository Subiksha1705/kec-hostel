import 'dotenv/config'
import { hashPassword } from '../lib/auth/password'

let prisma: typeof import('../lib/prisma').default | null = null

const DEFAULT_SUPER_EMAIL = ''
const DEFAULT_SUPER_PASSWORD = ''
const DEFAULT_SUPER_NAME = 'Super Admin'
const DEFAULT_COLLEGE_NAME = 'Super Admin College'
const DEFAULT_COLLEGE_LOCATION = 'System'

function usage() {
  console.log('Usage: yarn create-super-admin -- --email "admin@example.com" --password "secret" [--name "Super Admin"] [--college-id "uuid"] [--college-name "Super College"] [--college-location "City"]')
}

function getArg(flag: string) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

async function main() {
  if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
  }

  const prismaModule = await import('../lib/prisma')
  prisma = prismaModule.default

  const email = getArg('--email') ?? DEFAULT_SUPER_EMAIL
  const password = getArg('--password') ?? DEFAULT_SUPER_PASSWORD
  const name = getArg('--name') ?? DEFAULT_SUPER_NAME
  const collegeId = getArg('--college-id')
  const collegeName = getArg('--college-name') ?? DEFAULT_COLLEGE_NAME
  const collegeLocation = getArg('--college-location') ?? DEFAULT_COLLEGE_LOCATION

  if (!email || !password) {
    usage()
    process.exit(1)
  }

  let college = null
  if (collegeId) {
    college = await prisma.college.findUnique({ where: { id: collegeId } })
    if (!college) {
      console.error('College not found for provided --college-id')
      process.exit(1)
    }
  } else {
    college = await prisma.college.findFirst({ where: { name: collegeName } })
    if (!college) {
      college = await prisma.college.create({
        data: { name: collegeName, location: collegeLocation },
      })
    }
  }

  const hashed = await hashPassword(password)
  const existing = await prisma.admin.findUnique({ where: { email } })

  if (existing) {
    const updated = await prisma.admin.update({
      where: { email },
      data: { name, password: hashed, collegeId: college.id },
    })
    console.log('Super admin updated')
    console.log(`id: ${updated.id}`)
    console.log(`email: ${updated.email}`)
    console.log(`collegeId: ${updated.collegeId}`)
    return
  }

  const admin = await prisma.admin.create({
    data: {
      name,
      email,
      password: hashed,
      collegeId: college.id,
    },
  })

  console.log('Super admin created')
  console.log(`id: ${admin.id}`)
  console.log(`email: ${admin.email}`)
  console.log(`collegeId: ${admin.collegeId}`)
}

main()
  .catch((err) => {
    console.error('Failed to create super admin')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect()
    }
  })
