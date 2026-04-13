import { requireClient } from '@/lib/auth-helpers'
import { TicketForm } from './ticket-form'

/**
 * Ticket Creation Page
 * Requirements: 5.1, 5.2, 5.3
 * 
 * Comprehensive form to create new support tickets with:
 * - Title and detailed description
 * - Priority selection
 * - Category selection
 * - Multiple image uploads
 * - Rich text description
 */
export default async function NewTicketPage() {
  await requireClient()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Support Ticket</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Provide detailed information about your issue to help us assist you better
        </p>
      </div>

      <TicketForm />
    </div>
  )
}
