import 'dotenv/config'
import prisma from '../lib/prisma'

function usage() {
  console.log('Usage: npm run create-college -- --name "College Name" --location "City" [--domain "example.edu"]')
}

function getArg(flag: string) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

async function main() {
  const name = getArg('--name')
  const location = getArg('--location')
  const domain = getArg('--domain')

  if (!name || !location) {
    usage()
    process.exit(1)
  }

  const college = await prisma.college.create({
    data: {
      name,
      location,
      ...(domain ? { domain } : {}),
    },
  })

  console.log('College created')
  console.log(`id: ${college.id}`)
  console.log(`name: ${college.name}`)
  console.log(`location: ${college.location}`)
  if (college.domain) console.log(`domain: ${college.domain}`)
}

main()
  .catch((err) => {
    console.error('Failed to create college')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
