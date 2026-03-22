import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedType="MEMBER">
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar userType="MEMBER" />
        <main style={{ flex: 1, padding: '32px' }}>{children}</main>
      </div>
    </AuthGuard>
  )
}
