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

// GET - Exportar recompensas a Excel (XLSX)
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

    // Crear contenido Excel en formato XML (Excel 2003 XML Spreadsheet)
    const excelRows: string[] = [];
    
    // Encabezado XML
    excelRows.push(`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Header">
<Font ss:Bold="1" ss:Color="#FFFFFF"/>
<Interior ss:Color="#F59E0B" ss:Pattern="Solid"/>
<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
</Style>
<Style ss:ID="Title">
<Font ss:Bold="1" ss:Size="16"/>
<Alignment ss:Horizontal="Left"/>
</Style>
<Style ss:ID="Data">
<Alignment ss:Vertical="Center"/>
</Style>
<Style ss:ID="AltRow">
<Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
</Style>
<Style ss:ID="Pendientes">
<Interior ss:Color="#FCD34D" ss:Pattern="Solid"/>
<Font ss:Bold="1"/>
</Style>
</Styles>
<Worksheet ss:Name="Recompensas">
<Table>
<Column ss:Width="180"/>
<Column ss:Width="200"/>
<Column ss:Width="120"/>
<Column ss:Width="100"/>
<Column ss:Width="140"/>
<Column ss:Width="140"/>
<Column ss:Width="150"/>
`);

    // Título
    excelRows.push(`<Row><Cell ss:MergeAcross="6" ss:StyleID="Title"><Data ss:Type="String">Recompensas FideliQR - ${new Date().toLocaleDateString('es-ES')}</Data></Cell></Row>`);
    excelRows.push('<Row/>'); // Espacio

    // Encabezados
    const headers = ['Cliente', 'Email', 'Teléfono', 'Total Compras', 'Recompensas Pendientes', 'Recompensas Canjeadas', 'Fecha Registro'];
    excelRows.push('<Row>');
    headers.forEach(header => {
      excelRows.push(`<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`);
    });
    excelRows.push('</Row>');

    // Datos
    clientes.forEach((cliente, index) => {
      const pendientes = cliente.recompensasPendientes || 0;
      const isAltRow = index % 2 === 1 && pendientes === 0;
      let rowStyle = '';
      if (pendientes > 0) {
        rowStyle = ' ss:StyleID="Pendientes"';
      } else if (isAltRow) {
        rowStyle = ' ss:StyleID="AltRow"';
      }
      
      excelRows.push(`<Row${rowStyle}>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(cliente.nombre as string || '')}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(cliente.email as string || '')}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(cliente.telefono as string || '')}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="Number">${cliente.comprasTotal || 0}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="Number">${pendientes}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="Number">${cliente.recompensasCanjeadas || 0}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${formatDate(cliente.createdAt as string)}</Data></Cell>`);
      excelRows.push('</Row>');
    });

    // Cerrar documento
    excelRows.push(`</Table>
</Worksheet>
</Workbook>`);

    const excel = excelRows.join('\n');

    return new NextResponse(excel, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="recompensas-fideliqr-${new Date().toISOString().split('T')[0]}.xls"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando recompensas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}
