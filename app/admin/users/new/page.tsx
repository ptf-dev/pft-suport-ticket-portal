import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { UserForm } from './user-form'

/**
 * User Creation Page
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 * 
 * Provides form to create new user with:
 * - Required fields: name, email, password, role
 * - Role selection (ADMIN or CLIENT)
 * - Company selection (required for CLIENT users)
 * - Password hashing with bcrypt
 * - Email uniqueness validation
 * - Field-level validation errors
 */
export default async function NewUserPage() {
  await requireAdmin()

  // Fetch all companies for the dropdown
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create User</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new user account to the system
        </p>
      </div>

      <UserForm companies={companies} />
    </div>
  )
}
