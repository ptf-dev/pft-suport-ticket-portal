import type { TicketRelationType } from '@prisma/client'

/** Reciprocal relation for each type (symmetric types map to themselves). */
export const RELATION_INVERSE: Record<TicketRelationType, TicketRelationType> = {
  BLOCKS: 'BLOCKED_BY',
  BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
  IS_IDEA_FOR: 'IS_IDEA_FOR',
  WILL_IMPLEMENT_AFTER: 'WILL_IMPLEMENT_AFTER',
  ADDED_TO_ROADMAP: 'ADDED_TO_ROADMAP',
  CLONES: 'CLONED_BY',
  CLONED_BY: 'CLONES',
  DUPLICATES: 'DUPLICATED_BY',
  DUPLICATED_BY: 'DUPLICATES',
  CAUSES: 'CAUSED_BY',
  CAUSED_BY: 'CAUSES',
  TESTS: 'TESTED_BY',
  TESTED_BY: 'TESTS',
  SPLIT_FROM: 'SPLIT_TO',
  SPLIT_TO: 'SPLIT_FROM',
}

/** Human label for each relation type. */
export const RELATION_LABEL: Record<TicketRelationType, string> = {
  BLOCKS: 'Blocks',
  BLOCKED_BY: 'Is blocked by',
  RELATES_TO: 'Relates to',
  IS_IDEA_FOR: 'Is idea for',
  WILL_IMPLEMENT_AFTER: 'Will implement after',
  ADDED_TO_ROADMAP: 'Added to roadmap',
  CLONES: 'Clones',
  CLONED_BY: 'Is cloned by',
  DUPLICATES: 'Duplicates',
  DUPLICATED_BY: 'Is duplicated by',
  CAUSES: 'Causes',
  CAUSED_BY: 'Is caused by',
  TESTS: 'Tests',
  TESTED_BY: 'Is tested by',
  SPLIT_FROM: 'Split from',
  SPLIT_TO: 'Split to',
}

/** All relation types, in picker order. */
export const RELATION_TYPES = Object.keys(RELATION_LABEL) as TicketRelationType[]

export function relationLabel(t: TicketRelationType): string {
  return RELATION_LABEL[t] ?? String(t)
}
