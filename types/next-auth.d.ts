import NextAuth from "next-auth"
import { TenantRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      isAdmin: boolean
      // Multi-Tenancy
      activeTenantId: string | null
      tenants: Array<{
        tenantId: string
        tenantName: string
        tenantSlug: string
        role: TenantRole
        isActive: boolean
      }>
      isSuperAdmin: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    isAdmin: boolean
    // Multi-Tenancy (loaded at login time)
    activeTenantId?: string | null
    tenants?: Array<{
      tenantId: string
      tenantName: string
      tenantSlug: string
      role: TenantRole
      isActive: boolean
    }>
    isSuperAdmin?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isAdmin: boolean
    // Multi-Tenancy
    activeTenantId: string | null
    tenants: Array<{
      tenantId: string
      tenantName: string
      tenantSlug: string
      role: TenantRole
      isActive: boolean
    }>
    isSuperAdmin: boolean
  }
}
