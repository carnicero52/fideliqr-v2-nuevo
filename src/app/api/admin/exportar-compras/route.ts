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

// GET - Exportar compras a CSV
export async function GET(request: NextRequest) {
  const negocioId = request.nextUrl.searchParams.get('negocioId');
  
  if (!negocioId) {
    return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
  }

  try {
    const db = getTursoClient();
    
    // Obtener todas las compras del negocio con datos del cliente
    const result = await db.execute({
      sql: `SELECT 
        c.fecha,
        c.compraNumero,
        c.esRecompensa,
        cl.nombre as clienteNombre,
        cl.email as clienteEmail,
        cl.telefono as clienteTelefono
      FROM Compra c
      JOIN Cliente cl ON c.clienteId = cl.id
      WHERE c.negocioId = ?
      ORDER BY c.fecha DESC`,
      args: [negocioId]
    });

    const compras = result.rows;

    // Crear CSV
    const headers = ['Fecha', 'Número de Compra', 'Es Recompensa', 'Cliente', 'Email', 'Teléfono'];
    const csvRows = [headers.join(',')];

    for (const compra of compras) {
      const row = [
        `"${(compra.fecha as string || '').replace(/"/g, '""')}"`,
        compra.compraNumero || 0,
        compra.esRecompensa ? 'Sí' : 'No',
        `"${(compra.clienteNombre as string || '').replace(/"/g, '""')}"`,
        `"${(compra.clienteEmail as string || '').replace(/"/g, '""')}"`,
        `"${(compra.clienteTelefono as string || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="compras-fideliqr-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando compras:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
