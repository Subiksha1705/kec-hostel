import AuthGuard from '@/components/AuthGuard'
import ResizableSidebarShell from '@/components/layout/ResizableSidebarShell'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedType="MEMBER">
      <ResizableSidebarShell userType="MEMBER" showChatbot>
        {children}
      </ResizableSidebarShell>
    </AuthGuard>
  )
}
