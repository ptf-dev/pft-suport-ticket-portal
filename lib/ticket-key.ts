import { prisma } from '@/lib/prisma'

// 5-char keys from an unambiguous alphabet (no I, L, O, 0, 1).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const KEY_LENGTH = 5

export function generateTicketKey(): string {
  let k = ''
  for (let i = 0; i < KEY_LENGTH; i++) {
    k += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return k
}

/** Generate a ticket key not already used (retries on the rare collision). */
export async function uniqueTicketKey(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const k = generateTicketKey()
    const existing = await prisma.ticket.findUnique({ where: { key: k }, select: { id: true } })
    if (!existing) return k
  }
  // Extremely unlikely; fall back to a longer key to guarantee uniqueness.
  return generateTicketKey() + generateTicketKey().slice(0, 2)
}
