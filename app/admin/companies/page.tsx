import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import Link from 'next/link'
import { Plus, Building2, Users, Ticket, ArrowRight } from 'lucide-react'

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

  const allCompanies = await prisma.company.findMany({
    select: { _count: { select: { users: true, tickets: true } } },
  })
  const totalUsers   = allCompanies.reduce((s, c) => s + c._count.users, 0)
  const totalTickets = allCompanies.reduce((s, c) => s + c._count.tickets, 0)

  const currentSort  = searchParams.sort ?? 'createdAt'
  const currentOrder = (searchParams.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  const stats = [
    { label: 'Companies', value: total,        icon: Building2 },
    { label: 'Users',     value: totalUsers,   icon: Users },
    { label: 'Tickets',   value: totalTickets, icon: Ticket },
  ]

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Client roster, <em className="italic text-accent">at a glance.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute truncate">
            Operations · Companies
          </span>
        </div>
        <Link href="/admin/companies/new">
          <Button variant="accent" className="gap-2">
            <Plus className="w-4 h-4" />Create company
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
                <SortableTh column="name"         label="Company" currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="contactEmail" label="Contact" currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="users"        label="Users"   currentSort={currentSort} currentOrder={currentOrder} align="center" />
                <SortableTh column="tickets"      label="Tickets" currentSort={currentSort} currentOrder={currentOrder} align="center" />
                <SortableTh column="createdAt"    label="Created" currentSort={currentSort} currentOrder={currentOrder} />
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mute">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Building2 className="w-10 h-10 text-ink-faint" strokeWidth={1.2} />
                      <p className="font-display text-2xl tracking-tightest text-ink">No companies yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="group hover:bg-bg-sunken transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-ink text-bg flex items-center justify-center font-display text-sm shrink-0">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink truncate">{company.name}</div>
                          {company.subdomain && (
                            <div className="font-mono text-[11px] text-ink-mute truncate">{company.subdomain}.propfirmstech.com</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-soft">{company.contactEmail}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-md bg-mute font-mono text-xs tabular-nums text-ink-soft">{company._count.users}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-md bg-mute font-mono text-xs tabular-nums text-ink-soft">{company._count.tickets}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-soft tabular-nums">
                      {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/companies/${company.id}`} className="inline-flex items-center gap-1 text-ink-mute group-hover:text-accent text-sm font-medium transition-colors">
                        Edit <ArrowRight className="w-3 h-3" />
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
