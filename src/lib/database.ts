import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// Singleton para Prisma
let prisma: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  // Buscar variables de Turso
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  // Si tenemos URL de Turso (libsql://) y token, usar adapter
  if (tursoUrl && authToken && tursoUrl.startsWith('libsql://')) {
    console.log('🔵 Usando Turso:', tursoUrl.substring(0, 40) + '...')
    
    const libsql = createClient({
      url: tursoUrl,
      authToken: authToken,
    })
    
    const adapter = new PrismaLibSql(libsql)
    
    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    })
  }

  // Fallback a SQLite local para desarrollo
  console.log('🟢 Usando SQLite local')
  return new PrismaClient({
    log: ['error', 'warn'],
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
