/**
 * Example usage of the Prisma client singleton
 * This file demonstrates how to use the Prisma client in your application
 */

import { prisma } from './prisma'

// Example: Fetch all companies
export async function getAllCompanies() {
  return await prisma.company.findMany({
    include: {
      users: true,
      tickets: true,
    },
  })
}

// Example: Create a new company
export async function createCompany(data: {
  name: string
  subdomain: string
  contactEmail: string
  whatsappLink?: string
  notes?: string
}) {
  return await prisma.company.create({
    data,
  })
}

// Example: Get company by subdomain (for tenant resolution)
export async function getCompanyBySubdomain(subdomain: string) {
  return await prisma.company.findUnique({
    where: { subdomain },
  })
}

// Example: Get user with company
export async function getUserWithCompany(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: true,
    },
  })
}
