import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// Singleton para Prisma
let prisma: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  // Para Turso: usar TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN
  // DATABASE_URL se usa solo para el schema de Prisma (debe ser file:./dev.db)
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  console.log('🔵 Inicializando base de datos...')
  console.log('   TURSO_DATABASE_URL:', tursoUrl ? tursoUrl.substring(0, 40) + '...' : 'NO')
  console.log('   DATABASE_AUTH_TOKEN:', authToken ? `${authToken.length} chars` : 'NO')

  // Si tenemos URL de Turso y token, usar adapter
  if (tursoUrl && authToken && tursoUrl.startsWith('libsql://')) {
    console.log('   ✅ Conectando a Turso...')
    
    try {
      const libsql = createClient({
        url: tursoUrl,
        authToken: authToken,
      })
      
      const adapter = new PrismaLibSql(libsql)
      
      return new PrismaClient({
        adapter,
        log: ['error'],
      })
    } catch (error) {
      console.error('   ❌ Error conectando a Turso:', error)
      throw error
    }
  }

  // Fallback a SQLite local para desarrollo
  console.log('   📁 Usando SQLite local')
  return new PrismaClient({
    log: ['error'],
  })
}

// Exportar como db para usar en toda la app
export const db = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!prisma) {
      prisma = createPrismaClient()
    }
    const value = (prisma as Record<string, unknown>)[prop as string]
    if (typeof value === 'function') {
      return value.bind(prisma)
    }
    return value
  }
})
