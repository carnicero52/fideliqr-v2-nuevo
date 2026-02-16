import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  
  const diagnostics: Record<string, unknown> = {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    variables: {
      TURSO_DATABASE_URL: tursoUrl ? `${tursoUrl.substring(0, 40)}...` : 'NO DEFINIDO',
      DATABASE_URL: databaseUrl ? `${databaseUrl.substring(0, 40)}...` : 'NO DEFINIDO',
      DATABASE_AUTH_TOKEN: authToken ? `✅ ${authToken.length} chars` : 'NO DEFINIDO',
    },
  }
  
  // Determinar qué URL usar
  const urlToUse = tursoUrl || databaseUrl
  const hasAllVars = urlToUse && authToken && urlToUse.startsWith('libsql://')
  
  diagnostics.urlToUse = urlToUse ? `${urlToUse.substring(0, 40)}...` : 'NINGUNA'
  diagnostics.hasAllVars = hasAllVars
  
  // Intentar conectar a Turso
  if (hasAllVars) {
    try {
      const client = createClient({
        url: urlToUse as string,
        authToken: authToken as string,
      })
      
      // Verificar tablas
      const tables = await client.execute('SELECT name FROM sqlite_master WHERE type="table"')
      diagnostics.tables = tables.rows.map(r => r.name)
      
      // Test insert
      const testId = `test-${Date.now()}`
      await client.execute({
        sql: 'INSERT INTO Negocio (id, nombre, slug, emailDestino, password, activo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [testId, 'Test Debug', `test-debug-${Date.now()}`, `debug${Date.now()}@test.com`, 'test123', 1, new Date().toISOString(), new Date().toISOString()]
      })
      
      // Limpiar
      await client.execute({ sql: 'DELETE FROM Negocio WHERE id = ?', args: [testId] })
      
      diagnostics.connectionTest = '✅ EXITOSO - Base de datos Turso funcionando correctamente'
      
    } catch (error: unknown) {
      diagnostics.connectionTest = '❌ ERROR'
      diagnostics.error = error instanceof Error ? error.message : String(error)
    }
  } else {
    diagnostics.connectionTest = '❌ Variables incompletas'
    diagnostics.missing = []
    if (!urlToUse) (diagnostics.missing as string[]).push('TURSO_DATABASE_URL o DATABASE_URL')
    if (!authToken) (diagnostics.missing as string[]).push('DATABASE_AUTH_TOKEN')
    if (urlToUse && !urlToUse.startsWith('libsql://')) (diagnostics.missing as string[]).push('URL debe empezar con libsql://')
  }
  
  return NextResponse.json(diagnostics, { status: 200 })
}
