interface DashboardLayoutProps {
  children: React.ReactNode
  announcements?: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="max-w-6xl mx-auto">{children}</div>
  )
}
