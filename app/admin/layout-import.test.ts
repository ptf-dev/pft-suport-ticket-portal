import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Admin layout auth import', () => {
  it('uses next-auth instead of removed next/auth path', () => {
    const layoutPath = join(process.cwd(), 'app/admin/layout.tsx')
    const contents = readFileSync(layoutPath, 'utf8')

    expect(contents).not.toContain("from 'next/auth'")
    expect(contents).toContain("from 'next-auth'")
  })
})
