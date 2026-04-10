import { requireAdmin } from '@/lib/auth-helpers'
import { CompanyForm } from './company-form'

/**
 * Company Creation Page
 * Requirements: 3.2, 3.3
 * 
 * Provides form to create new company with:
 * - Required fields: name, contactEmail, subdomain
 * - Optional fields: whatsappLink, notes
 * - Client-side and server-side validation
 * - Subdomain uniqueness validation
 */
export default async function NewCompanyPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Company</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new prop firm client to the system
        </p>
      </div>

      <CompanyForm />
    </div>
  )
}
