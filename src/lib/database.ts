import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// Crear cliente Prisma dinámicamente
function createPrismaClient(): PrismaClient {
  // En producción, usar Turso - buscar variables con diferentes nombres
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
  
  console.log('🚀 ====== INICIALIZANDO BASE DE DATOS ======')
  console.log('   NODE_ENV:', process.env.NODE_ENV)
  console.log('   TURSO_DATABASE_URL:', tursoUrl ? tursoUrl.substring(0, 50) + '...' : 'NO DEFINIDO')
  console.log('   DATABASE_AUTH_TOKEN:', authToken ? `✅ (${authToken.length} chars)` : 'NO DEFINIDO')
  
  // Si tenemos URL de Turso (empieza con libsql://) y token, usar Turso
  if (tursoUrl && authToken && tursoUrl.startsWith('libsql://')) {
    console.log('   ✅ MODO: TURSO (producción)')
    try {
      const libsql = createClient({
        url: tursoUrl,
        authToken: authToken,
      })
      const adapter = new PrismaLibSql(libsql)
      return new PrismaClient({ adapter })
    } catch (error) {
      console.error('   ❌ Error conectando a Turso:', error)
      throw error
    }
  }
  
  // Fallback a SQLite local (solo para desarrollo local)
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
