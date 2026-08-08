import { RELATION_INVERSE, RELATION_LABEL, RELATION_TYPES } from './relations'

/**
 * Relations are stored as two rows (A->B and B->A). If a directional type maps
 * to itself, both tickets render the same label and the relationship reads
 * backwards on one side — which is exactly what happened with IS_IDEA_FOR.
 */
describe('RELATION_INVERSE', () => {
  // The only relation where both sides genuinely make the same claim.
  const SYMMETRIC = new Set(['RELATES_TO'])

  it('has an inverse for every relation type', () => {
    for (const type of RELATION_TYPES) {
      expect(RELATION_INVERSE[type]).toBeDefined()
    }
  })

  it('only maps a type to itself when that type is symmetric', () => {
    const selfMapped = RELATION_TYPES.filter((t) => RELATION_INVERSE[t] === t)
    expect(selfMapped.sort()).toEqual([...SYMMETRIC].sort())
  })

  it('is an involution — inverse(inverse(x)) === x', () => {
    for (const type of RELATION_TYPES) {
      expect(RELATION_INVERSE[RELATION_INVERSE[type]]).toBe(type)
    }
  })

  it('has a distinct human label for every type', () => {
    const labels = RELATION_TYPES.map((t) => RELATION_LABEL[t])
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
