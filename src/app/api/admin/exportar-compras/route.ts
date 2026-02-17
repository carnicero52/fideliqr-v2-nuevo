import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos');
  }

  return createClient({ url, authToken });
}

// GET - Exportar compras a PDF
export async function GET(request: NextRequest) {
  const negocioId = request.nextUrl.searchParams.get('negocioId');
  
  if (!negocioId) {
    return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
  }

  const tempFile = `/tmp/compras-${Date.now()}.pdf`;

  try {
    const db = getTursoClient();
    
    // Obtener negocio
    const negocioResult = await db.execute({
      sql: 'SELECT nombre FROM Negocio WHERE id = ?',
      args: [negocioId]
    });
    const negocioNombre = negocioResult.rows[0]?.nombre || 'Negocio';
    
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

    const compras = result.rows.map(row => ({
      fecha: row.fecha as string || '',
      compraNumero: row.compraNumero as number || 0,
      esRecompensa: row.esRecompensa === 1 || row.esRecompensa === true,
      clienteNombre: row.clienteNombre as string || '',
      clienteEmail: row.clienteEmail as string || '',
      clienteTelefono: row.clienteTelefono as string || '',
    }));

    // Generar PDF usando Python
    const comprasJson = JSON.stringify(compras).replace(/"/g, '\\"');
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_compras_pdf.py');
    
    await execAsync(
      `python3 "${scriptPath}" "${tempFile}" "${comprasJson}" "${negocioNombre}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    // Leer el PDF generado
    const pdfBuffer = await readFile(tempFile);
    
    // Eliminar archivo temporal
    await unlink(tempFile).catch(() => {});

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compras-fideliqr-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando compras:', error);
    await unlink(tempFile).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
