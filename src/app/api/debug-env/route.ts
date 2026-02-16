import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  
  return NextResponse.json({
    database_url: dbUrl ? {
      present: true,
      prefix: dbUrl.substring(0, 30) + '...',
      isLibsql: dbUrl.startsWith('libsql://')
    } : { present: false },
    database_auth_token: authToken ? {
      present: true,
      length: authToken.length
    } : { present: false },
    node_env: process.env.NODE_ENV,
    all_env_keys: Object.keys(process.env).filter(k => 
      k.includes('DATABASE') || 
      k.includes('TURSO') || 
      k.includes('PRISMA')
    )
  })
}
