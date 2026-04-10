import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTenantCompany } from '@/lib/tenant'
import ModernPortalNav from './modern-portal-nav'

/**
 * Portal layout with modern navigation
 * Requirements: 10.1, 10.3
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login')
  }

  // Redirect to admin if admin user
  if (session.user.role === 'ADMIN') {
    redirect('/admin')
  }

  // Get company information for display
  const company = session.user.companyId 
    ? await getTenantCompany(session.user.companyId)
    : null

  return (
    <ModernPortalNav 
      user={session.user} 
      companyName={company?.name || 'Unknown Company'} 
    >
      {children}
    </ModernPortalNav>
  )
}
