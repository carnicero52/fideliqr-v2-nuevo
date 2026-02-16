import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  
  const diagnostics: Record<string, unknown> = {
    environment: process.env.NODE_ENV,
    variables: {
      TURSO_DATABASE_URL: tursoUrl ? `${tursoUrl.substring(0, 40)}...` : 'NO DEFINIDO',
      DATABASE_URL: databaseUrl ? `${databaseUrl.substring(0, 40)}...` : 'NO DEFINIDO',
      DATABASE_AUTH_TOKEN: authToken ? `✅ ${authToken.length} chars` : 'NO DEFINIDO',
    },
    tursoConfigured: !!(tursoUrl && authToken && tursoUrl.startsWith('libsql://')),
    databaseUrlIsTurso: databaseUrl?.startsWith('libsql://') || false,
  }
  
  // Intentar conectar a Turso
  const urlToUse = tursoUrl || databaseUrl
  
  if (urlToUse && authToken && urlToUse.startsWith('libsql://')) {
    try {
      const client = createClient({
        url: urlToUse,
        authToken: authToken,
      })
      
      const result = await client.execute('SELECT name FROM sqlite_master WHERE type="table"')
      diagnostics.connectionTest = '✅ Conexión exitosa a Turso'
      diagnostics.tables = result.rows.map(r => r.name)
      
      // Intentar insertar un negocio de prueba
      const testId = `test-${Date.now()}`
      await client.execute({
        sql: 'INSERT INTO Negocio (id, nombre, slug, emailDestino, password, activo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [testId, 'Test Debug', 'test-debug', 'debug@test.com', 'test123', 1, new Date().toISOString(), new Date().toISOString()]
      })
      
      diagnostics.insertTest = '✅ Insert exitoso'
      
      // Limpiar - eliminar el registro de prueba
      await client.execute({ sql: 'DELETE FROM Negocio WHERE id = ?', args: [testId] })
      diagnostics.deleteTest = '✅ Delete exitoso'
      
    } catch (error: unknown) {
      diagnostics.connectionTest = '❌ Error de conexión'
      diagnostics.error = error instanceof Error ? error.message : String(error)
    }
  } else {
    diagnostics.connectionTest = '❌ Variables de entorno incompletas'
    diagnostics.reason = !urlToUse ? 'Falta URL' : !authToken ? 'Falta token' : 'URL no empieza con libsql://'
  }
  
  return NextResponse.json(diagnostics, { status: 200 })
}
