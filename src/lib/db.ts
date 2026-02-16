import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Obtener variables de conexión
  const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  console.log('🔍 DB Config:', {
    dbUrl: dbUrl ? dbUrl.substring(0, 30) + '...' : 'undefined',
    hasAuthToken: !!authToken,
    nodeEnv: process.env.NODE_ENV
  })

  // Si hay URL de Turso y token, usar Turso
  if (dbUrl && dbUrl.startsWith('libsql://') && authToken) {
    try {
      console.log('🔗 Conectando a Turso...')
      const libsql = createClient({
        url: dbUrl,
        authToken: authToken,
      })

      const adapter = new PrismaLibSql(libsql)
      console.log('✅ Conexión Turso exitosa')
      return new PrismaClient({ adapter })
    } catch (error) {
      console.error('❌ Error conectando a Turso:', error)
      throw error
    }
  }

  // Si no, usar SQLite local (solo para desarrollo)
  console.log('📁 Usando SQLite local')
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
