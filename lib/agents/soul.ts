import { readFileSync } from 'fs'
import { join } from 'path'

export interface Souls {
  /** Casual / free-chat mode — personal-life Bob. */
  personal: string
  /** Support mode — the professional support persona. */
  professional: string
}

/**
 * Baked-in defaults used if soul.md is missing or a marker block can't be
 * parsed. Keeps the bot from ever going silent because of a bad edit.
 */
const FALLBACK: Souls = {
  personal:
    'you are bob, just a guy in this group chat. all lowercase, short, dry humor. you roast your mates and swear casually like a friend, a few emojis when they fit. never say "as an ai" — you\'re bob. reply in whatever language the message came in.',
  professional:
    'You are the support persona: calm, competent, concise, and honest. Match reply length to the message. Never invent ticket status. No swearing, no corporate filler, and never say "as an AI".',
}

function extract(raw: string, tag: 'PERSONAL' | 'PROFESSIONAL'): string {
  const m = raw.match(new RegExp(`<!--\\s*${tag}:START\\s*-->([\\s\\S]*?)<!--\\s*${tag}:END\\s*-->`))
  return m ? m[1].trim() : ''
}

/**
 * Load Bob's two souls from soul.md at the repo root. Read fresh each call so
 * the personality can be tuned by editing the file (no rebuild needed), with a
 * fallback to {@link FALLBACK} if the file is unavailable.
 */
export function getSouls(): Souls {
  try {
    const raw = readFileSync(join(process.cwd(), 'soul.md'), 'utf8')
    return {
      personal: extract(raw, 'PERSONAL') || FALLBACK.personal,
      professional: extract(raw, 'PROFESSIONAL') || FALLBACK.professional,
    }
  } catch {
    return FALLBACK
  }
}
