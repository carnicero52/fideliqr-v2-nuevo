import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { generatePDF } from '@/lib/pdf-generator';

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos');
  }

  return createClient({ url, authToken });
}

// GET - Exportar recompensas a PDF
export async function GET(request: NextRequest) {
  const negocioId = request.nextUrl.searchParams.get('negocioId');
  
  if (!negocioId) {
    return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
  }

  try {
    const db = getTursoClient();
    
    // Obtener negocio
    const negocioResult = await db.execute({
      sql: 'SELECT nombre FROM Negocio WHERE id = ?',
      args: [negocioId]
    });
    const negocioNombre = negocioResult.rows[0]?.nombre || 'Negocio';
    
    // Obtener clientes con recompensas (pendientes o canjeadas)
    const result = await db.execute({
      sql: `SELECT 
        nombre,
        email,
        telefono,
        comprasTotal,
        recompensasPendientes,
        recompensasCanjeadas
      FROM Cliente 
      WHERE negocioId = ? AND (recompensasPendientes > 0 OR recompensasCanjeadas > 0)
      ORDER BY recompensasPendientes DESC, recompensasCanjeadas DESC`,
      args: [negocioId]
    });

    const clientes = result.rows;

    // Rows with pendientes for highlighting
    const rows = clientes.map((c) => [
      String(c.nombre || ''),
      String(c.email || ''),
      String(c.telefono || '-'),
      Number(c.comprasTotal || 0),
      Number(c.recompensasPendientes || 0),
      Number(c.recompensasCanjeadas || 0),
    ]);

    // Highlight rows where pendientes > 0
    const highlightRows = clientes
      .map((c, i) => (Number(c.recompensasPendientes || 0) > 0 ? i : -1))
      .filter(i => i >= 0);

    // Totals
    const totalPendientes = clientes.reduce((sum, c) => sum + Number(c.recompensasPendientes || 0), 0);
    const totalCanjeadas = clientes.reduce((sum, c) => sum + Number(c.recompensasCanjeadas || 0), 0);

    // Generar PDF
    const pdfBuffer = await generatePDF({
      title: `Recompensas - ${negocioNombre}`,
      subtitle: `Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      columns: [
        { header: 'Cliente', width: 150, align: 'left' },
        { header: 'Email', width: 160, align: 'left' },
        { header: 'Teléfono', width: 80 },
        { header: 'Compras', width: 60 },
        { header: 'Pend.', width: 50 },
        { header: 'Canj.', width: 50 },
      ],
      rows,
      headerColor: '#F59E0B',
      alternateColor: '#FEF3C7',
      highlightRows,
      highlightColor: '#FCD34D',
      totals: `Clientes con recompensas: ${clientes.length} | Pendientes: ${totalPendientes} | Canjeadas: ${totalCanjeadas}`,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recompensas-fideliqr-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando recompensas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
