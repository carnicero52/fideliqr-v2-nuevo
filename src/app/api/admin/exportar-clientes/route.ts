import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { generatePDF, formatDate } from '@/lib/pdf-generator';

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos');
  }

  return createClient({ url, authToken });
}

// GET - Exportar clientes a PDF
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
    
    // Obtener todos los clientes del negocio
    const result = await db.execute({
      sql: `SELECT 
        nombre, 
        email, 
        telefono, 
        comprasTotal, 
        recompensasPendientes, 
        recompensasCanjeadas
      FROM Cliente 
      WHERE negocioId = ? AND activo = 1
      ORDER BY createdAt DESC`,
      args: [negocioId]
    });

    const clientes = result.rows;

    // Generar PDF
    const pdfBuffer = await generatePDF({
      title: `Clientes - ${negocioNombre}`,
      subtitle: `Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      columns: [
        { header: 'Nombre', width: 150, align: 'left' },
        { header: 'Email', width: 160, align: 'left' },
        { header: 'Teléfono', width: 80 },
        { header: 'Compras', width: 60 },
        { header: 'Pend.', width: 50 },
        { header: 'Canj.', width: 50 },
      ],
      rows: clientes.map((c) => [
        String(c.nombre || ''),
        String(c.email || ''),
        String(c.telefono || '-'),
        Number(c.comprasTotal || 0),
        Number(c.recompensasPendientes || 0),
        Number(c.recompensasCanjeadas || 0),
      ]),
      headerColor: '#4F46E5',
      alternateColor: '#F5F5F5',
      totals: `Total de clientes: ${clientes.length}`,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="clientes-fideliqr-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando clientes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
