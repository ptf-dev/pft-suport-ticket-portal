import { prisma } from '@/lib/prisma'

const DUPLICATE_TITLE_THRESHOLD = 0.6

function titleWords(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2))
}

function titleSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let shared = 0
  Array.from(a).forEach((w) => { if (b.has(w)) shared++ })
  return shared / (a.size + b.size - shared)
}

export interface LikelyDuplicateTicket {
  id: string
  key: string | null
  title: string
}

export async function findLikelyDuplicateTicket(companyId: string, proposedTitle: string): Promise<LikelyDuplicateTicket | null> {
  if (!proposedTitle.trim()) return null
  const openTickets = await prisma.ticket.findMany({
    where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT'] } },
    select: { id: true, key: true, title: true },
  })
  const proposedWords = titleWords(proposedTitle)
  let best: LikelyDuplicateTicket | null = null
  let bestScore = 0
  for (const t of openTickets) {
    const score = titleSimilarity(proposedWords, titleWords(t.title))
    if (score > bestScore) { bestScore = score; best = t }
  }
  return bestScore >= DUPLICATE_TITLE_THRESHOLD ? best : null
}
