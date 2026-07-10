import { prisma } from '@/lib/prisma'
import ReviewActions from './review-actions'

export const dynamic = 'force-dynamic'

/** Super-admin review queue for self-signup access requests. */
export default async function AccessRequestsPage() {
  const [pending, recent, companies] = await Promise.all([
    prisma.signupRequest.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
    prisma.signupRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { reviewedAt: 'desc' },
      take: 25,
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-8 max-w-5xl">
      <section>
        <h2 className="font-display text-lg text-ink mb-1">Pending ({pending.length})</h2>
        <p className="text-sm text-ink-mute mb-4">Map each applicant to a firm to approve, or reject the request.</p>

        {pending.length === 0 ? (
          <p className="text-sm text-ink-mute">No pending requests.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((r) => (
              <div key={r.id} className="p-4 rounded-lg border border-line bg-bg-elev">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{r.name} · <span className="text-ink-mute">{r.email}</span></div>
                    <div className="text-sm text-ink-soft mt-0.5">Firm (as typed): <strong>{r.firmName}</strong></div>
                    {r.note && <div className="text-sm text-ink-mute mt-1">“{r.note}”</div>}
                    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint mt-2">
                      {new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                    </div>
                  </div>
                  <ReviewActions requestId={r.id} companies={companies} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Recently reviewed</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-mute">Nothing reviewed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-mute border-b border-line">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Firm typed</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 text-ink">{r.name}</td>
                    <td className="py-2 pr-4 text-ink-soft">{r.email}</td>
                    <td className="py-2 pr-4 text-ink-soft">{r.firmName}</td>
                    <td className="py-2 pr-4">
                      <span className={r.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
