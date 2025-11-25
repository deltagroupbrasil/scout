import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Crown, Building2, Users, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Verificar se usuário é SuperAdmin
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { userId: session.user.id },
  })

  if (!superAdmin) {
    // Não é super admin - redirecionar para dashboard
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Super-Admin */}
      <nav className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Crown className="h-6 w-6" />
              <h1 className="text-xl font-bold">Super Admin</h1>
            </div>

            <Link href="/dashboard">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 max-w-7xl py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2">
              <Link
                href="/super-admin/tenants"
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Tenants</span>
              </Link>
              <Link
                href="/super-admin/users"
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Usuários</span>
              </Link>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="col-span-12 lg:col-span-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
