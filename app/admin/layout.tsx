import AuthGuard from '@/components/AuthGuard'
import ResizableSidebarShell from '@/components/layout/ResizableSidebarShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedType="ADMIN">
      <ResizableSidebarShell userType="ADMIN" showChatbot>
        {children}
      </ResizableSidebarShell>
    </AuthGuard>
  )
}
