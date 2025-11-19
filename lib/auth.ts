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

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}
