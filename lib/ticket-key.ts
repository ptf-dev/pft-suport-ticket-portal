import { prisma } from '@/lib/prisma'

/** Derive a 3-letter prefix from a company name, e.g. "Prime Trading Group" -> "PTG". */
export function companyPrefix(companyName: string): string {
  const words = companyName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  let letters = words.map((w) => w[0]).join('').toUpperCase()

  if (letters.length < 3) {
    // Not enough words — pad out using the remaining letters of the first word.
    const filler = (words[0] ?? '').slice(1).toUpperCase()
    letters += filler
  }

  letters = letters.replace(/[^A-Z0-9]/g, '')
  letters = (letters + 'XXX').slice(0, 3)
  return letters
}

/** Generate a unique ticket key: 3-letter company prefix + dash + 3-digit sequence, e.g. FTM-042. */
export async function uniqueTicketKey(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  })

  const prefix = companyPrefix(company?.name ?? 'GEN')

  const last = await prisma.ticket.findFirst({
    where: { key: { startsWith: `${prefix}-` } },
    orderBy: { key: 'desc' },
    select: { key: true },
  })

  let next = 1
  if (last?.key) {
    const match = last.key.match(/-(\d+)$/)
    if (match) next = parseInt(match[1], 10) + 1
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}-${String(next).padStart(3, '0')}`
    const existing = await prisma.ticket.findUnique({ where: { key: candidate }, select: { id: true } })
    if (!existing) return candidate
    next++
  }

  // Extremely unlikely fallback to guarantee uniqueness.
  return `${prefix}-${Date.now().toString().slice(-6)}`
}
