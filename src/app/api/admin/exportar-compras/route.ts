import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { generatePDF, formatDate } from '@/lib/pdf-generator';
import PDFDocument from 'pdfkit';

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos');
  }

  return createClient({ url, authToken });
}

// GET - Exportar compras a PDF (landscape)
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

    // Generar PDF en formato landscape
    const pdfBuffer = await generateComprasPDF({
      title: `Compras - ${negocioNombre}`,
      subtitle: `Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      columns: [
        { header: 'Fecha', width: 120 },
        { header: 'N° Compra', width: 70 },
        { header: 'Recompensa', width: 70 },
        { header: 'Cliente', width: 140, align: 'left' },
        { header: 'Email', width: 160, align: 'left' },
        { header: 'Teléfono', width: 80 },
      ],
      rows: compras.map((c) => [
        formatDate(c.fecha as string),
        Number(c.compraNumero || 0),
        (c.esRecompensa === 1 || c.esRecompensa === true) ? 'Sí' : 'No',
        String(c.clienteNombre || ''),
        String(c.clienteEmail || ''),
        String(c.clienteTelefono || '-'),
      ]),
      headerColor: '#3B82F6',
      alternateColor: '#F5F5F5',
      highlightRows: compras.map((c, i) => (c.esRecompensa === 1 || c.esRecompensa === true) ? i : -1).filter(i => i >= 0),
      highlightColor: '#FEF3C7',
      totals: `Total de compras: ${compras.length} | Recompensas: ${compras.filter(c => c.esRecompensa === 1 || c.esRecompensa === true).length}`,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compras-fideliqr-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando compras:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Separate function for landscape PDF
async function generateComprasPDF(options: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'letter',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18)
        .fillColor(options.headerColor)
        .font('Helvetica-Bold')
        .text(options.title, { align: 'left' });
      
      // Subtitle
      if (options.subtitle) {
        doc.fontSize(9)
          .fillColor('#666666')
          .font('Helvetica')
          .text(options.subtitle, { align: 'left' });
      }
      
      doc.moveDown(1);

      // Table
      const startX = doc.page.margins.left;
      let y = doc.y;
      const rowHeight = 22;
      const headerHeight = 26;
      const totalWidth = options.columns.reduce((sum: number, col: any) => sum + col.width, 0);

      // Draw header
      doc.fillColor('#FFFFFF');
      doc.rect(startX, y, totalWidth, headerHeight)
        .fill(options.headerColor);
      
      doc.fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold');
      
      let x = startX;
      options.columns.forEach((col: any) => {
        doc.text(col.header, x + 3, y + 7, {
          width: col.width - 6,
          align: col.align || 'center',
        });
        x += col.width;
      });
      
      y += headerHeight;

      // Draw rows
      doc.font('Helvetica').fontSize(7);
      options.rows.forEach((row: any[], index: number) => {
        // Check page break
        if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
        }
        
        // Background color
        let bgColor = '#FFFFFF';
        if (options.highlightRows?.includes(index)) {
          bgColor = options.highlightColor || '#FEF3C7';
        } else if (index % 2 === 1 && options.alternateColor) {
          bgColor = options.alternateColor;
        }
        
        doc.fillColor(bgColor);
        doc.rect(startX, y, totalWidth, rowHeight).fill();
        
        // Cell content
        doc.fillColor('#333333');
        x = startX;
        options.columns.forEach((col: any, colIndex: number) => {
          doc.text(String(row[colIndex] ?? ''), x + 3, y + 6, {
            width: col.width - 6,
            align: col.align || 'center',
            ellipsis: true,
          });
          x += col.width;
        });
        
        // Row border
        doc.strokeColor('#E0E0E0');
        doc.lineWidth(0.5);
        doc.rect(startX, y, totalWidth, rowHeight).stroke();
        
        y += rowHeight;
      });

      // Totals
      if (options.totals) {
        doc.moveDown(1);
        doc.fontSize(9)
          .fillColor('#333333')
          .font('Helvetica-Bold')
          .text(options.totals);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
