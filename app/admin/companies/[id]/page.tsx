import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CompanyFormFields } from '../company-form-fields'

/**
 * Company Edit Page
 * Requirements: 3.4
 * 
 * Displays company edit form with:
 * - Pre-populated form fields with existing company data
 * - Validation similar to creation (subdomain can remain unchanged)
 * - Subdomain uniqueness check when changed
 * - Redirect to /admin/companies on success
 */
export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireAdmin()

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          users: true,
          tickets: true,
        },
      },
    },
  })

  if (!company) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Company</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update company information and settings
          </p>
        </div>
        <Link href="/admin/companies">
          <Button variant="outline">Back to Companies</Button>
        </Link>
      </div>

      {/* Company Statistics */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Users: {company._count.users}</span>
          <span>Tickets: {company._count.tickets}</span>
          <span>Created: {new Date(company.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Edit Form */}
      <CompanyFormFields
        mode="edit"
        companyId={company.id}
        initialData={{
          name: company.name,
          contactEmail: company.contactEmail,
          subdomain: company.subdomain,
          whatsappLink: company.whatsappLink || '',
          notes: company.notes || '',
        }}
      />
    </div>
  )
}
