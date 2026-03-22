import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedType="ADMIN">
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar userType="ADMIN" />
        <main style={{ flex: 1, padding: '32px' }}>{children}</main>
      </div>
    </AuthGuard>
  )
}
