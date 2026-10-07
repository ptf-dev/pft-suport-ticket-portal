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
      <header className="space-y-2">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Tell us <em className="italic text-accent">what happened.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            Client portal · New ticket
          </span>
        </div>
        <p className="text-sm text-ink-mute">
          The more detail you give, the faster we can help.
        </p>
      </header>

      <TicketForm />
    </div>
  )
}
