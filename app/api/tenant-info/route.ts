import { NextResponse } from 'next/server'
import { getTenantFromRequest, getTenantCompany } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to get tenant information
 * GET /api/tenant-info
 * Returns the current tenant context including company name
 */
export async function GET() {
  try {
    const tenant = await getTenantFromRequest()

    if (!tenant) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      )
    }

    // Get company details for tenant branding
    const company = await getTenantCompany(tenant.tenantId)

    if (!company) {
      return NextResponse.json(
        { error: 'Tenant company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      name: company.name,
      subdomain: company.subdomain,
      tenantId: company.id,
    })
  } catch (error) {
    console.error('Error getting tenant info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
