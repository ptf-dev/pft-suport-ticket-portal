import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import Link from 'next/link'

const PAGE_SIZE = 20

const SORT_MAP: Record<string, object> = {
  name:         { name: 'asc' },
  contactEmail: { contactEmail: 'asc' },
  users:        { users: { _count: 'asc' } },
  tickets:      { tickets: { _count: 'asc' } },
  createdAt:    { createdAt: 'asc' },
}

function applyDir(obj: any, dir: string): any {
  const r: any = {}
  for (const k of Object.keys(obj)) r[k] = typeof obj[k] === 'object' ? applyDir(obj[k], dir) : dir
  return r
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; order?: string }
}) {
  await requireAdmin()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'createdAt') : 'createdAt'
  const order = searchParams.order === 'asc' ? 'asc' : 'desc'
  const orderBy = applyDir(SORT_MAP[sortKey], order)

  const [total, companies] = await Promise.all([
    prisma.company.count(),
    prisma.company.findMany({
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { users: true, tickets: true } } },
    }),
  ])

  // Stats from full dataset
  const allCompanies = await prisma.company.findMany({
    select: { _count: { select: { users: true, tickets: true } } },
  })
  const totalUsers   = allCompanies.reduce((s, c) => s + c._count.users, 0)
  const totalTickets = allCompanies.reduce((s, c) => s + c._count.tickets, 0)

  const currentSort  = searchParams.sort ?? 'createdAt'
  const currentOrder = (searchParams.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Companies</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage prop firm clients and their information</p>
        </div>
        <Link href="/admin/companies/new">
          <Button className="shadow-md hover:shadow-lg transition-shadow">
            <span className="mr-2">➕</span>Create Company
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Companies', value: total,        icon: '🏢', gradient: 'from-blue-500 to-indigo-500' },
          { label: 'Total Users',     value: totalUsers,   icon: '👥', gradient: 'from-green-500 to-emerald-500' },
          { label: 'Total Tickets',   value: totalTickets, icon: '🎫', gradient: 'from-purple-500 to-pink-500' },
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
                <SortableTh column="name"         label="Company" currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="contactEmail" label="Contact" currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="users"        label="Users"   currentSort={currentSort} currentOrder={currentOrder} align="center" />
                <SortableTh column="tickets"      label="Tickets" currentSort={currentSort} currentOrder={currentOrder} align="center" />
                <SortableTh column="createdAt"    label="Created" currentSort={currentSort} currentOrder={currentOrder} />
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🏢</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No companies found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {company.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{company.name}</div>
                          {company.subdomain && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {company.subdomain}.propfirmstech.com
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{company.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg">
                        <span className="text-sm font-bold text-green-700 dark:text-green-300">{company._count.users}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{company._count.tickets}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/companies/${company.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm transition-colors">
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination total={total} page={page} pageSize={PAGE_SIZE} />
      </div>
    </div>
  )
}
