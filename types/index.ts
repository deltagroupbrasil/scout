// LeapScout - Type Definitions
import { LeadStatus } from '@prisma/client'

// ============================================
// CONTACT TYPES
// ============================================
export interface SuggestedContact {
  name: string
  role: string
  linkedin?: string
  email?: string
  phone?: string
}

// ============================================
// LEAD TYPES
// ============================================
export interface LeadWithCompany {
  id: string
  company: {
    id: string
    name: string
    cnpj?: string | null
    revenue?: number | null
    employees?: number | null
    sector?: string | null
    location?: string | null
    website?: string | null
    linkedinUrl?: string | null
  }
  jobTitle: string
  jobDescription: string
  jobUrl: string
  jobPostedDate: Date
  jobSource: string
  candidateCount?: number | null
  suggestedContacts?: SuggestedContact[] | null
  triggers?: string[] | null
  status: LeadStatus
  isNew: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    notes: number
  }
}

export interface LeadFilters {
  status?: LeadStatus | 'ALL'
  search?: string
  revenueMin?: number
  revenueMax?: number
  dateRange?: '7d' | '30d' | 'all'
}

// ============================================
// NOTE TYPES
// ============================================
export interface NoteWithUser {
  id: string
  content: string
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================
// SCRAPING TYPES
// ============================================
export interface LinkedInJobData {
  title: string
  company: string
  companyUrl?: string
  location: string
  description: string
  postedDate: Date
  jobUrl: string
  candidateCount?: number
}

export interface CompanyEnrichmentData {
  cnpj?: string
  revenue?: number
  employees?: number
  sector?: string
  website?: string
  linkedinUrl?: string
}

// ============================================
// AI TYPES
// ============================================
export interface AIInsights {
  suggestedContacts: SuggestedContact[]
  triggers: string[]
}
