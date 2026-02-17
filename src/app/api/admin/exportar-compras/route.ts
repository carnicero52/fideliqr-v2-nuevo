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

// GET - Exportar compras a Excel (XLSX)
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
<Interior ss:Color="#3B82F6" ss:Pattern="Solid"/>
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
<Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
</Style>
<Style ss:ID="Recompensa">
<Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
<Font ss:Color="#92400E"/>
</Style>
</Styles>
<Worksheet ss:Name="Compras">
<Table>
<Column ss:Width="150"/>
<Column ss:Width="120"/>
<Column ss:Width="100"/>
<Column ss:Width="180"/>
<Column ss:Width="200"/>
<Column ss:Width="120"/>
`);

    // Título
    excelRows.push(`<Row><Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">Compras FideliQR - ${new Date().toLocaleDateString('es-ES')}</Data></Cell></Row>`);
    excelRows.push('<Row/>'); // Espacio

    // Encabezados
    const headers = ['Fecha', 'N° Compra', 'Es Recompensa', 'Cliente', 'Email', 'Teléfono'];
    excelRows.push('<Row>');
    headers.forEach(header => {
      excelRows.push(`<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`);
    });
    excelRows.push('</Row>');

    // Datos
    compras.forEach((compra, index) => {
      const isAltRow = index % 2 === 1 && !compra.esRecompensa;
      const isRecompensa = compra.esRecompensa === 1 || compra.esRecompensa === true;
      let rowStyle = '';
      if (isRecompensa) {
        rowStyle = ' ss:StyleID="Recompensa"';
      } else if (isAltRow) {
        rowStyle = ' ss:StyleID="AltRow"';
      }
      
      excelRows.push(`<Row${rowStyle}>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${formatDate(compra.fecha as string)}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="Number">${compra.compraNumero || 0}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${isRecompensa ? 'Sí' : 'No'}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(compra.clienteNombre as string || '')}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(compra.clienteEmail as string || '')}</Data></Cell>`);
      excelRows.push(`<Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(compra.clienteTelefono as string || '')}</Data></Cell>`);
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
        'Content-Disposition': `attachment; filename="compras-fideliqr-${new Date().toISOString().split('T')[0]}.xls"`
      }
    });
  } catch (error: any) {
    console.error('Error exportando compras:', error);
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
