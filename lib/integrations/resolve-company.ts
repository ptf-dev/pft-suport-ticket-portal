import { prisma } from '@/lib/prisma'
import type { Company } from '@prisma/client'

function slugifyProjectId(projectId: string): string {
  return projectId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Collapse a name to comparable form: lowercase, alphanumeric only. */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

async function uniqueSubdomain(base: string): Promise<string> {
  let candidate = base || 'brand'
  let suffix = 0
  while (true) {
    const existing = await prisma.company.findUnique({
      where: { subdomain: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
}

export async function resolveCompanyForProject(params: {
  projectId: string
  projectName?: string
  brandName?: string
  supportEmail?: string
}): Promise<Company> {
  const projectId = params.projectId.trim().toLowerCase()
  const subdomainCandidate = slugifyProjectId(projectId)

  let company =
    (await prisma.company.findUnique({
      where: { projectId },
    })) ??
    (await prisma.company.findUnique({
      where: { subdomain: subdomainCandidate },
    }))

  if (company && !company.projectId) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { projectId },
    })
  }

  if (company) {
    if (!company.isActive) {
      throw new Error(`Support portal company for project "${projectId}" is inactive`)
    }
    return company
  }

  // No projectId/subdomain hit. Before creating, adopt an existing unlinked
  // company whose name matches this project/brand — avoids spawning duplicates
  // (e.g. "Next Stage Funded" for projectId "nextstagefunded").
  const targets = new Set(
    [projectId, params.brandName, params.projectName]
      .filter((v): v is string => Boolean(v && v.trim()))
      .map(normalizeName),
  )
  if (targets.size > 0) {
    const unlinked = await prisma.company.findMany({ where: { projectId: null } })
    const match = unlinked.find((c) => targets.has(normalizeName(c.name)))
    if (match) {
      if (!match.isActive) {
        throw new Error(`Support portal company "${match.name}" is inactive`)
      }
      return prisma.company.update({ where: { id: match.id }, data: { projectId } })
    }
  }

  const name = params.brandName?.trim() || params.projectName?.trim() || projectId
  const contactEmail =
    params.supportEmail?.trim() || `support+${projectId}@propfirmstech.com`

  return prisma.company.create({
    data: {
      projectId,
      name,
      subdomain: await uniqueSubdomain(subdomainCandidate),
      contactEmail,
      notes: `Auto-provisioned from dashboard escalation (projectId: ${projectId})`,
      isActive: true,
    },
  })
}
