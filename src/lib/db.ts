import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Intentar obtener URL de Turso primero, luego DATABASE_URL
  let dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  console.log('🔍 Inicializando Prisma Client...')
  console.log('   TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ Presente' : '❌ No configurado')
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) + '...' : 'No configurado')
  console.log('   DATABASE_AUTH_TOKEN:', authToken ? '✅ Presente' : '❌ No configurado')

  // Si hay URL de Turso y token, usar Turso
  if (dbUrl && dbUrl.startsWith('libsql://') && authToken) {
    try {
      console.log('🔗 Conectando a Turso:', dbUrl)
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

  // Si no hay Turso, usar SQLite local
  console.log('📁 Usando SQLite local (desarrollo)')
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Lazy initialization
let _db: PrismaClient | null = null

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_db) {
      _db = createPrismaClient()
    }
    const value = (_db as any)[prop]
    if (typeof value === 'function') {
      return value.bind(_db)
    }
    return value
  }
})
