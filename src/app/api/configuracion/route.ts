import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos');
  }

  return createClient({ url, authToken });
}

// GET - Obtener configuración del negocio
export async function GET(request: NextRequest) {
  try {
    const negocioId = request.nextUrl.searchParams.get('negocioId');
    
    if (!negocioId) {
      return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
    }

    const db = getTursoClient();
    
    const result = await db.execute({
      sql: `SELECT 
        id, nombre, slug, emailDestino, telefono, direccion, descripcion,
        notifEmailActivo, notifEmailRemitente, notifEmailAsunto, notifEmailMensaje,
        notifTelegramActivo, notifTelegramToken, notifTelegramChatId,
        recompensaComprasNecesarias, recompensaDescripcion, recompensaMensaje, recompensaVigenciaDias
      FROM Negocio WHERE id = ?`,
      args: [negocioId]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ config: result.rows[0] });
  } catch (error: any) {
    console.error('Error obteniendo configuración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Actualizar configuración del negocio
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { negocioId, ...updates } = data;

    if (!negocioId) {
      return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
    }

    const db = getTursoClient();

    // Campos permitidos para actualizar
    const allowedFields = [
      'nombre', 'telefono', 'direccion', 'descripcion',
      'notifEmailActivo', 'notifEmailRemitente', 'notifEmailAsunto', 'notifEmailMensaje',
      'notifTelegramActivo', 'notifTelegramToken', 'notifTelegramChatId',
      'recompensaComprasNecesarias', 'recompensaDescripcion', 'recompensaMensaje', 'recompensaVigenciaDias'
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const setClause = Object.keys(filteredUpdates)
      .map(k => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(filteredUpdates), negocioId];

    await db.execute({
      sql: `UPDATE Negocio SET ${setClause}, updatedAt = datetime('now') WHERE id = ?`,
      args: values as any[]
    });

    // Obtener la configuración actualizada
    const result = await db.execute({
      sql: `SELECT 
        id, nombre, slug, emailDestino, telefono, direccion, descripcion,
        notifEmailActivo, notifEmailRemitente, notifEmailAsunto, notifEmailMensaje,
        notifTelegramActivo, notifTelegramToken, notifTelegramChatId,
        recompensaComprasNecesarias, recompensaDescripcion, recompensaMensaje, recompensaVigenciaDias
      FROM Negocio WHERE id = ?`,
      args: [negocioId]
    });

    return NextResponse.json({ 
      success: true, 
      config: result.rows[0],
      message: 'Configuración actualizada correctamente' 
    });
  } catch (error: any) {
    console.error('Error actualizando configuración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Inicializar columnas nuevas si no existen
export async function PUT(request: NextRequest) {
  try {
    const db = getTursoClient();
    
    // Intentar agregar columnas nuevas si no existen
    const alterStatements = [
      `ALTER TABLE Negocio ADD COLUMN notifEmailActivo INTEGER DEFAULT 1`,
      `ALTER TABLE Negocio ADD COLUMN notifEmailRemitente TEXT`,
      `ALTER TABLE Negocio ADD COLUMN notifEmailAsunto TEXT DEFAULT 'Tu código QR de FideliQR'`,
      `ALTER TABLE Negocio ADD COLUMN notifEmailMensaje TEXT`,
      `ALTER TABLE Negocio ADD COLUMN notifTelegramActivo INTEGER DEFAULT 0`,
      `ALTER TABLE Negocio ADD COLUMN notifTelegramToken TEXT`,
      `ALTER TABLE Negocio ADD COLUMN notifTelegramChatId TEXT`,
      `ALTER TABLE Negocio ADD COLUMN recompensaComprasNecesarias INTEGER DEFAULT 10`,
      `ALTER TABLE Negocio ADD COLUMN recompensaDescripcion TEXT DEFAULT 'Producto gratis'`,
      `ALTER TABLE Negocio ADD COLUMN recompensaMensaje TEXT DEFAULT '¡Felicidades! Has alcanzado tu recompensa'`,
      `ALTER TABLE Negocio ADD COLUMN recompensaVigenciaDias INTEGER DEFAULT 30`,
    ];

    const results: string[] = [];
    
    for (const sql of alterStatements) {
      try {
        await db.execute(sql);
        results.push(`OK: ${sql.split('ADD COLUMN')[1]?.split(' ')[1] || 'columna'}`);
      } catch (e: any) {
        // La columna ya existe, ignorar
        if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
          results.push(`EXISTS: ${sql.split('ADD COLUMN')[1]?.split(' ')[1] || 'columna'}`);
        } else {
          results.push(`ERROR: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migración completada',
      details: results 
    });
  } catch (error: any) {
    console.error('Error en migración:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
