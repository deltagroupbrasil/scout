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
  source?: 'linkedin' | 'google' | 'website' | 'estimated' | 'congonhas_api' // Origem do contato
}

// ============================================
// RELATED JOB TYPES
// ============================================
export interface RelatedJob {
  title: string
  description: string
  url: string
  postedDate: Date | string
  candidateCount?: number | null
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
  relatedJobs?: string | null // JSON string de RelatedJob[]
  suggestedContacts?: SuggestedContact[] | null
  triggers?: string[] | null
  status: LeadStatus
  priorityScore: number
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
  jobTitle: string
  companyName: string
  companyUrl?: string
  location: string
  description: string
  jobDescription?: string
  postedDate: Date
  jobPostedDate?: Date
  jobUrl: string
  candidateCount?: number
  applicants?: number
  jobSource?: string
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
