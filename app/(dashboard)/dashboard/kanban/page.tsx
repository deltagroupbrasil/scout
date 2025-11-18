import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { LeadStatus } from "@prisma/client"
import KanbanBoard from "@/components/dashboard/kanban-board"

export const metadata = {
  title: "Kanban - Gestão de Leads | LeapScout",
  description: "Quadro Kanban para gestão visual de leads pela equipe comercial",
}

async function getLeadsByStatus(userId?: string, showAll: boolean = false) {
  const leads = await prisma.lead.findMany({
    where: showAll ? {} : {
      OR: [
        { assignedToId: userId },
        { assignedToId: null }, // Leads não atribuídos
      ],
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          cnpj: true,
          revenue: true,
          employees: true,
          sector: true,
          location: true,
          website: true,
          linkedinUrl: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          notes: true,
        },
      },
    },
    orderBy: [
      { priorityScore: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  // Agrupar por status
  const grouped = {
    NEW: leads.filter(l => l.status === 'NEW'),
    CONTACTED: leads.filter(l => l.status === 'CONTACTED'),
    QUALIFIED: leads.filter(l => l.status === 'QUALIFIED'),
    DISCARDED: leads.filter(l => l.status === 'DISCARDED'),
  }

  return grouped
}

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const params = await searchParams
  const showAll = params.view === 'all'

  const leadsByStatus = await getLeadsByStatus(session.user.id, showAll)

  // Buscar todos os usuários para dropdown
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-muted-foreground mt-1">
            Gestão visual de leads para o time comercial
          </p>
        </div>
      </div>

      <KanbanBoard
        initialLeads={leadsByStatus}
        users={users}
        currentUserId={session.user.id}
        showAll={showAll}
      />
    </div>
  )
}
