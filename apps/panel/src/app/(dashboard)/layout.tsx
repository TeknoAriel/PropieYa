import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { AuthGuard } from '@/components/auth-guard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-primary">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
