export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          padding: '16px 32px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '18px' }}>Hostel Portal</span>
        <a href="/login" style={{ color: 'var(--sage-dark)', textDecoration: 'none', fontWeight: 500 }}>
          Login
        </a>
      </header>
      <main style={{ padding: '32px' }}>{children}</main>
    </div>
  )
}
