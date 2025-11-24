"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User } from "next-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutList, LayoutDashboard, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardNavProps {
  user: User
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()

  const allNavItems = [
    {
      href: "/dashboard",
      label: "Lista",
      icon: LayoutList,
      active: pathname === "/dashboard" || pathname?.startsWith("/dashboard/leads"),
      adminOnly: false,
    },
    {
      href: "/dashboard/kanban",
      label: "Kanban",
      icon: LayoutDashboard,
      active: pathname === "/dashboard/kanban",
      adminOnly: true, // Apenas admin pode ver o Kanban
    },
    {
      href: "/dashboard/search-queries",
      label: "Buscar Vagas",
      icon: Search,
      active: pathname === "/dashboard/search-queries",
      adminOnly: true, // Apenas admin pode buscar vagas
    },
  ]

  // Filtrar itens de navegação baseado em permissões
  const navItems = allNavItems.filter(item =>
    !item.adminOnly || user.isAdmin
  )

  return (
    <nav className="border-b bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl"></span>
              <h1 className="text-xl font-bold">LeapScout</h1>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      item.active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
