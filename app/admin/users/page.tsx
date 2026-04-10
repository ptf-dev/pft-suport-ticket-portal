import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-600">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{users.length}</div>
                <div className="text-sm font-medium text-gray-600">Total Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {users.filter((u) => u.role === 'ADMIN').length}
                </div>
                <div className="text-sm font-medium text-gray-600">Admins</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🧑‍💼</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {users.filter((u) => u.role === 'CLIENT').length}
                </div>
                <div className="text-sm font-medium text-gray-600">Clients</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">👥</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500">No users found</p>
                      <p className="text-xs text-gray-400">Create your first user to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-blue-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {user.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                        className="font-medium"
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {user.company?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
