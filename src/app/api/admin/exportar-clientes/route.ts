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

// GET - Exportar clientes a PDF
export async function GET(request: NextRequest) {
  const negocioId = request.nextUrl.searchParams.get('negocioId');
  
  if (!negocioId) {
    return NextResponse.json({ error: 'negocioId es requerido' }, { status: 400 });
  }

  const tempFile = `/tmp/clientes-${Date.now()}.pdf`;

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

    const clientes = result.rows.map(row => ({
      nombre: row.nombre as string || '',
      email: row.email as string || '',
      telefono: row.telefono as string || '',
      comprasTotal: row.comprasTotal as number || 0,
      recompensasPendientes: row.recompensasPendientes as number || 0,
      recompensasCanjeadas: row.recompensasCanjeadas as number || 0,
    }));

    // Generar PDF usando Python
    const clientesJson = JSON.stringify(clientes).replace(/"/g, '\\"');
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_clientes_pdf.py');
    
    await execAsync(
      `python3 "${scriptPath}" "${tempFile}" "${clientesJson}" "${negocioNombre}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    // Leer el PDF generado
    const pdfBuffer = await readFile(tempFile);
    
    // Eliminar archivo temporal
    await unlink(tempFile).catch(() => {});

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="clientes-fideliqr-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando clientes:', error);
    // Limpiar archivo temporal en caso de error
    await unlink(tempFile).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
