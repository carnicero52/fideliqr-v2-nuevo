import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.DATABASE_AUTH_TOKEN

  console.log('🔍 DB Config:', {
    hasTursoUrl: !!tursoUrl,
    hasTursoToken: !!tursoToken,
    tursoUrlPrefix: tursoUrl?.substring(0, 20) + '...',
    nodeEnv: process.env.NODE_ENV
  })

  if (tursoUrl && tursoToken && tursoUrl.startsWith('libsql://')) {
    try {
      console.log('🔗 Conectando a Turso...')
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      })

      const adapter = new PrismaLibSql(libsql)
      console.log('✅ Conexión Turso exitosa')
      return new PrismaClient({ adapter })
    } catch (error) {
      console.error('❌ Error conectando a Turso:', error)
      throw error
    }
  }

  console.log('📁 Usando SQLite local')
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
