import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import Link from 'next/link'
import { UsersTable } from './users-table'
import { Plus, Users, ShieldCheck, UserRound } from 'lucide-react'

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

  const [totalCount, adminCount, clientCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
  ])

  const currentSort = searchParams.sort ?? 'createdAt'
  const currentOrder = (searchParams.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  const stats = [
    { label: 'Total users', value: totalCount,  icon: Users },
    { label: 'Admins',      value: adminCount,  icon: ShieldCheck },
    { label: 'Clients',     value: clientCount, icon: UserRound },
  ]

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Everyone with <em className="italic text-accent">a key.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute truncate">
            Operations · Users
          </span>
        </div>
        <Link href="/admin/users/new">
          <Button variant="accent" className="gap-2">
            <Plus className="w-4 h-4" />Create user
          </Button>
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-bg-elev border border-line rounded-xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-mute flex items-center justify-center text-ink-soft shrink-0">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-display text-2xl text-ink tracking-tightest tabular-nums leading-none">{value}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line-soft">
            <thead className="bg-bg-sunken">
              <tr>
                <SortableTh column="name"      label="User"    currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="email"     label="Email"   currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="role"      label="Role"    currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="company"   label="Company" currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="createdAt" label="Created" currentSort={currentSort} currentOrder={currentOrder} />
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mute">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              <UsersTable users={users} />
            </tbody>
          </table>
        </div>
        <TablePagination total={total} page={page} pageSize={PAGE_SIZE} />
      </div>
    </div>
  )
}
