import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { AdminTicketForm } from './ticket-form'

export default async function NewAdminTicketPage() {
  await requireAdmin()

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Ticket</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create a ticket on behalf of any company user
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        <AdminTicketForm companies={companies} />
      </div>
    </div>
  )
}
