import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import "./env-validator" // Validação de variáveis de ambiente

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('[Auth] Tentando autenticar:', credentials?.email)

          if (!credentials?.email || !credentials?.password) {
            console.error('[Auth] Credenciais incompletas')
            throw new Error("Email e senha são obrigatórios")
          }

          console.log('[Auth] Buscando usuário no banco...')
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase()
            },
            include: {
              tenantUsers: {
                where: { isActive: true },
                include: {
                  tenant: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      isActive: true,
                    }
                  }
                }
              },
              superAdmin: true,
            }
          })

          if (!user) {
            console.error('[Auth] Usuário não encontrado:', credentials.email)
            throw new Error("Credenciais inválidas")
          }

          console.log('[Auth] Usuário encontrado:', user.id)
          console.log('[Auth] Comparando senha...')

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.error('[Auth] Senha inválida')
            throw new Error("Credenciais inválidas")
          }

          console.log('[Auth] ✅ Autenticação bem-sucedida!')

          // Preparar lista de tenants ativos
          const tenants = user.tenantUsers
            .filter(tu => tu.tenant.isActive)
            .map(tu => ({
              tenantId: tu.tenant.id,
              tenantName: tu.tenant.name,
              tenantSlug: tu.tenant.slug,
              role: tu.role,
              isActive: tu.isActive,
            }))

          console.log(`[Auth] Usuário tem acesso a ${tenants.length} tenant(s)`)

          // Se usuário não tem tenants, bloquear acesso
          if (tenants.length === 0 && !user.superAdmin) {
            console.error('[Auth] Usuário sem tenants ativos')
            throw new Error("Usuário não possui acesso a nenhuma organização")
          }

          // Usar lastActiveTenantId ou primeiro tenant disponível
          const activeTenantId = user.lastActiveTenantId || tenants[0]?.tenantId || null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            activeTenantId,
            tenants,
            isSuperAdmin: !!user.superAdmin,
          }
        } catch (error: any) {
          console.error('[Auth] Erro durante autenticação:', error.message)
          console.error('[Auth] Stack:', error.stack)
          throw error
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Login inicial: carregar dados do usuário
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin
        token.activeTenantId = user.activeTenantId || null
        token.tenants = user.tenants || []
        token.isSuperAdmin = user.isSuperAdmin || false
      }

      // Atualização de sessão (ex: switch de tenant)
      if (trigger === "update" && session?.activeTenantId) {
        token.activeTenantId = session.activeTenantId
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.activeTenantId = token.activeTenantId as string | null
        session.user.tenants = token.tenants as any
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}
