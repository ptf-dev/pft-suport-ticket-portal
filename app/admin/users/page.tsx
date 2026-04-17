import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import Link from 'next/link'
import { UsersTable } from './users-table'

const PAGE_SIZE = 20

const SORT_MAP: Record<string, object> = {
  name:      { name: 'asc' },
  email:     { email: 'asc' },
  role:      { role: 'asc' },
  company:   { company: { name: 'asc' } },
  createdAt: { createdAt: 'asc' },
}

function applyDir(obj: any, dir: string): any {
  const r: any = {}
  for (const k of Object.keys(obj)) r[k] = typeof obj[k] === 'object' ? applyDir(obj[k], dir) : dir
  return r
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; order?: string }
}) {
  await requireAdmin()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'createdAt') : 'createdAt'
  const order = searchParams.order === 'asc' ? 'asc' : 'desc'
  const orderBy = applyDir(SORT_MAP[sortKey], order)

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { company: { select: { name: true } } },
    }),
  ])

  // Stats always use full count
  const [totalCount, adminCount, clientCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
  ])

  const currentSort = searchParams.sort ?? 'createdAt'
  const currentOrder = (searchParams.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage user accounts and access permissions</p>
        </div>
        <Link href="/admin/users/new">
          <Button className="shadow-md hover:shadow-lg transition-shadow">
            <span className="mr-2">➕</span>Create User
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', value: totalCount, icon: '👥', gradient: 'from-blue-500 to-indigo-500' },
          { label: 'Admins', value: adminCount, icon: '👑', gradient: 'from-purple-500 to-pink-500' },
          { label: 'Clients', value: clientCount, icon: '🧑‍💼', gradient: 'from-green-500 to-emerald-500' },
        ].map(({ label, value, icon, gradient }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md`}>
                <span className="text-2xl">{icon}</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <tr>
                <SortableTh column="name"      label="User"    currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="email"     label="Email"   currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="role"      label="Role"    currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="company"   label="Company" currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="createdAt" label="Created" currentSort={currentSort} currentOrder={currentOrder} />
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              <UsersTable users={users} />
            </tbody>
          </table>
        </div>
        <TablePagination total={total} page={page} pageSize={PAGE_SIZE} />
      </div>
    </div>
  )
}
