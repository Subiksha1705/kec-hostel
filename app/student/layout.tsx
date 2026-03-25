import AuthGuard from '@/components/AuthGuard'
import ResizableSidebarShell from '@/components/layout/ResizableSidebarShell'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedType="STUDENT">
      <ResizableSidebarShell userType="STUDENT" showChatbot>
        {children}
      </ResizableSidebarShell>
    </AuthGuard>
  )
}
