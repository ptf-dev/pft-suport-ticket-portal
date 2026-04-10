import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ModernAdminNav from './modern-admin-nav'

/**
 * Admin layout with modern sidebar navigation
 * Requirements: 10.2, 10.3
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login')
  }

  // Redirect to portal if not admin
  if (session.user.role !== 'ADMIN') {
    redirect('/portal')
  }

  return (
    <ModernAdminNav user={session.user}>
      {children}
    </ModernAdminNav>
  )
}
