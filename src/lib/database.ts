import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// Crear cliente Prisma dinámicamente
function createPrismaClient(): PrismaClient {
  // En producción, usar Turso
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  
  console.log('🚀 ====== INICIALIZANDO BASE DE DATOS ======')
  console.log('   NODE_ENV:', process.env.NODE_ENV)
  console.log('   TURSO_DATABASE_URL:', tursoUrl ? tursoUrl.substring(0, 40) + '...' : 'NO DEFINIDO')
  console.log('   DATABASE_AUTH_TOKEN:', authToken ? `✅ (${authToken.length} chars)` : 'NO DEFINIDO')
  
  if (tursoUrl && authToken && tursoUrl.startsWith('libsql://')) {
    console.log('   ✅ MODO: TURSO (producción)')
    const libsql = createClient({
      url: tursoUrl,
      authToken: authToken,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }
  
  // Fallback a SQLite local
  console.log('   📁 MODO: SQLite local (desarrollo)')
  return new PrismaClient()
}

// Singleton para evitar múltiples conexiones
let prismaInstance: PrismaClient | null = null

export const db = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!prismaInstance) {
      prismaInstance = createPrismaClient()
    }
    const value = (prismaInstance as any)[prop]
    if (typeof value === 'function') {
      return value.bind(prismaInstance)
    }
    return value
  }
})
