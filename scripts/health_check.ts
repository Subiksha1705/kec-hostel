import 'dotenv/config'

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'

const endpoints: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/api/auth/admin/login' },
  { method: 'POST', path: '/api/auth/admin/register' },
  { method: 'POST', path: '/api/auth/member/login' },
  { method: 'POST', path: '/api/auth/student/login' },
  { method: 'GET', path: '/api/roles' },
  { method: 'GET', path: '/api/members' },
  { method: 'GET', path: '/api/students' },
  { method: 'GET', path: '/api/leaves' },
]

async function checkEndpoint(method: string, path: string) {
  const url = `${baseUrl}${path}`
  try {
    const res = await fetch(url, { method })
    const healthy = res.status !== 404 && res.status < 500
    return { url, status: res.status, healthy }
  } catch (err) {
    return { url, status: 0, healthy: false, error: err }
  }
}

async function main() {
  console.log(`API base: ${baseUrl}`)
  const results = await Promise.all(endpoints.map((e) => checkEndpoint(e.method, e.path)))

  let failed = 0
  for (const r of results) {
    if (r.healthy) {
      console.log(`[OK] ${r.status} ${r.url}`)
    } else {
      failed += 1
      console.log(`[FAIL] ${r.status} ${r.url}`)
    }
  }

  if (failed > 0) {
    console.log(`\n${failed} endpoint(s) failed health check.`)
    process.exit(1)
  } else {
    console.log('\nAll endpoints healthy.')
  }
}

main().catch((err) => {
  console.error('Health check failed')
  console.error(err)
  process.exit(1)
})
