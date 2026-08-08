import type { TicketRelationType } from '@prisma/client'

/**
 * Reciprocal relation for each type.
 *
 * Only RELATES_TO is genuinely symmetric. Every other type is directional and
 * MUST map to a distinct opposite — mapping a directional type to itself makes
 * both tickets claim the same side of the relationship (e.g. two tickets that
 * are each "Is idea for" the other).
 */
export const RELATION_INVERSE: Record<TicketRelationType, TicketRelationType> = {
  BLOCKS: 'BLOCKED_BY',
  BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
  IS_IDEA_FOR: 'HAS_IDEA',
  HAS_IDEA: 'IS_IDEA_FOR',
  WILL_IMPLEMENT_AFTER: 'WILL_BE_IMPLEMENTED_BEFORE',
  WILL_BE_IMPLEMENTED_BEFORE: 'WILL_IMPLEMENT_AFTER',
  ADDED_TO_ROADMAP: 'ROADMAP_INCLUDES',
  ROADMAP_INCLUDES: 'ADDED_TO_ROADMAP',
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
  HAS_IDEA: 'Has idea',
  WILL_IMPLEMENT_AFTER: 'Will implement after',
  WILL_BE_IMPLEMENTED_BEFORE: 'Will be implemented before',
  ADDED_TO_ROADMAP: 'Added to roadmap',
  ROADMAP_INCLUDES: 'Roadmap includes',
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
