import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { assignedToId } = body

    // Se assignedToId for null, está desatribuindo
    const updateData: any = {
      assignedToId: assignedToId || null,
      assignedAt: assignedToId ? new Date() : null,
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Erro ao atribuir lead:", error)
    return NextResponse.json(
      { error: "Erro ao atribuir lead" },
      { status: 500 }
    )
  }
}
