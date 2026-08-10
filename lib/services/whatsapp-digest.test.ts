import {
  summariseActivities,
  formatDigest,
  DIGEST_ACTIVITY_TYPES,
  DIGEST_MAX_TICKETS,
} from './whatsapp-digest'
import type { ActivityType } from '@prisma/client'

const T0 = new Date('2026-08-10T06:00:00.000Z')
const at = (mins: number) => new Date(T0.getTime() + mins * 60 * 1000)
const ticket = (id: string, key: string, title = 'A ticket') => ({ id, key, title })

const act = (
  type: ActivityType,
  t: { id: string; key: string; title: string },
  opts: { from?: string | null; to?: string | null; mins?: number } = {},
) => ({
  type,
  fromValue: opts.from ?? null,
  toValue: opts.to ?? null,
  createdAt: at(opts.mins ?? 0),
  ticket: t,
})

describe('DIGEST_ACTIVITY_TYPES', () => {
  // A digest full of assignment/watcher/relation churn would recreate the very
  // noise it exists to remove.
  it('covers client-visible activity only', () => {
    expect(DIGEST_ACTIVITY_TYPES).toEqual(['CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'COMMENTED'])
    expect(DIGEST_ACTIVITY_TYPES).not.toContain('ASSIGNED')
    expect(DIGEST_ACTIVITY_TYPES).not.toContain('INTERNAL_NOTE')
    expect(DIGEST_ACTIVITY_TYPES).not.toContain('WATCHER_ADDED')
  })
})

describe('summariseActivities', () => {
  it('folds many events on one ticket into a single entry', () => {
    const t = ticket('t1', 'XPI-1')
    const out = summariseActivities([
      act('STATUS_CHANGED', t, { from: 'OPEN', to: 'IN_PROGRESS', mins: 1 }),
      act('COMMENTED', t, { mins: 2 }),
      act('COMMENTED', t, { mins: 3 }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].comments).toBe(2)
    expect(out[0].statusFrom).toBe('OPEN')
    expect(out[0].statusTo).toBe('IN_PROGRESS')
  })

  // Reports where the ticket ended up, not each hop along the way.
  it('spans from the first change to the last across a chain', () => {
    const t = ticket('t1', 'XPI-1')
    const out = summariseActivities([
      act('STATUS_CHANGED', t, { from: 'OPEN', to: 'IN_PROGRESS', mins: 1 }),
      act('STATUS_CHANGED', t, { from: 'IN_PROGRESS', to: 'RESOLVED', mins: 5 }),
    ])
    expect(out[0].statusFrom).toBe('OPEN')
    expect(out[0].statusTo).toBe('RESOLVED')
  })

  it('is not fooled by out-of-order input', () => {
    const t = ticket('t1', 'XPI-1')
    const out = summariseActivities([
      act('STATUS_CHANGED', t, { from: 'IN_PROGRESS', to: 'RESOLVED', mins: 5 }),
      act('STATUS_CHANGED', t, { from: 'OPEN', to: 'IN_PROGRESS', mins: 1 }),
    ])
    expect(out[0].statusFrom).toBe('OPEN')
    expect(out[0].statusTo).toBe('RESOLVED')
  })

  it('separates tickets and puts the most recently touched first', () => {
    const a = ticket('t1', 'XPI-1')
    const b = ticket('t2', 'XPI-2')
    const out = summariseActivities([
      act('COMMENTED', a, { mins: 1 }),
      act('COMMENTED', b, { mins: 10 }),
    ])
    expect(out.map((s) => s.key)).toEqual(['XPI-2', 'XPI-1'])
  })

  it('flags newly created tickets', () => {
    const t = ticket('t1', 'XPI-1')
    const out = summariseActivities([act('CREATED', t, { to: 'A ticket' })])
    expect(out[0].created).toBe(true)
  })

  it('returns nothing for an empty window', () => {
    expect(summariseActivities([])).toEqual([])
  })
})

describe('formatDigest', () => {
  const summarise = (acts: Parameters<typeof summariseActivities>[0]) => summariseActivities(acts)

  it('leads with the company and the ticket count', () => {
    const out = formatDigest('Trading Cult', summarise([act('COMMENTED', ticket('t1', 'TCR-1'))]), 6)
    expect(out).toContain('Trading Cult')
    expect(out).toContain('last 6h')
    expect(out).toContain('1 ticket updated')
  })

  it('pluralises the ticket count', () => {
    const out = formatDigest('Acme', summarise([
      act('COMMENTED', ticket('t1', 'A-1')),
      act('COMMENTED', ticket('t2', 'A-2')),
    ]), 6)
    expect(out).toContain('2 tickets updated')
  })

  it('shows the status transition and comment count', () => {
    const t = ticket('t1', 'XPI-1', 'Wrong market price')
    const out = formatDigest('XPips', summarise([
      act('STATUS_CHANGED', t, { from: 'OPEN', to: 'IN_PROGRESS', mins: 1 }),
      act('COMMENTED', t, { mins: 2 }),
    ]), 6)
    expect(out).toContain('XPI-1')
    expect(out).toContain('open → *in progress*')
    expect(out).toContain('1 comment')
  })

  // Status "changes" that land where the ticket already was are pure noise.
  it('omits a status change that did not actually move', () => {
    const t = ticket('t1', 'XPI-1')
    const out = formatDigest('XPips', summarise([
      act('STATUS_CHANGED', t, { from: 'OPEN', to: 'OPEN', mins: 1 }),
      act('COMMENTED', t, { mins: 2 }),
    ]), 6)
    expect(out).not.toContain('→')
    expect(out).toContain('1 comment')
  })

  it('collapses a long list rather than posting a wall of text', () => {
    const many = Array.from({ length: DIGEST_MAX_TICKETS + 5 }, (_, i) =>
      act('COMMENTED', ticket(`t${i}`, `K-${i}`), { mins: i }))
    const out = formatDigest('Acme', summarise(many), 6)
    expect(out).toContain('+5 more')
    expect(out.split('\n•')).toHaveLength(DIGEST_MAX_TICKETS + 1)
  })

  it('reports the real window length when a run was missed', () => {
    const out = formatDigest('Acme', summarise([act('COMMENTED', ticket('t1', 'A-1'))]), 12)
    expect(out).toContain('last 12h')
  })
})
