import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { UsersTable } from './users-table'

/**
 * Admin Users List Page
 * Requirements: 4.1
 * 
 * Displays all users with:
 * - User name, email, role, company name
 * - Role badges (ADMIN, CLIENT)
 * - Create User button
 */
export default async function UsersPage() {
  // Protect route - admin only
  await requireAdmin()

  // Query all users with their company information
  const users = await prisma.user.findMany({
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage user accounts and access permissions
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button className="shadow-md hover:shadow-lg transition-shadow">
            <span className="mr-2">➕</span>
            Create User
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      {users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{users.length}</div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {users.filter((u) => u.role === 'ADMIN').length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🧑‍💼</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {users.filter((u) => u.role === 'CLIENT').length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Clients</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                <UsersTable users={users} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
