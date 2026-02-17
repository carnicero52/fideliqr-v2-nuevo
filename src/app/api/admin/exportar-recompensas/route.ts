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

// GET - Exportar recompensas a CSV
export async function GET(request: NextRequest) {
  const negocioId = request.nextUrl.searchParams.get('negocioId');
  
  if (!negocioId) {
    return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
  }

  try {
    const db = getTursoClient();
    
    // Obtener clientes con recompensas (pendientes o canjeadas)
    const result = await db.execute({
      sql: `SELECT 
        nombre,
        email,
        telefono,
        comprasTotal,
        recompensasPendientes,
        recompensasCanjeadas,
        createdAt
      FROM Cliente 
      WHERE negocioId = ? AND (recompensasPendientes > 0 OR recompensasCanjeadas > 0)
      ORDER BY recompensasPendientes DESC, recompensasCanjeadas DESC`,
      args: [negocioId]
    });

    const clientes = result.rows;

    // Crear CSV
    const headers = ['Cliente', 'Email', 'Teléfono', 'Total Compras', 'Recompensas Pendientes', 'Recompensas Canjeadas', 'Fecha Registro'];
    const csvRows = [headers.join(',')];

    for (const cliente of clientes) {
      const row = [
        `"${(cliente.nombre as string || '').replace(/"/g, '""')}"`,
        `"${(cliente.email as string || '').replace(/"/g, '""')}"`,
        `"${(cliente.telefono as string || '').replace(/"/g, '""')}"`,
        cliente.comprasTotal || 0,
        cliente.recompensasPendientes || 0,
        cliente.recompensasCanjeadas || 0,
        `"${cliente.createdAt || ''}"`
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="recompensas-fideliqr-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando recompensas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
