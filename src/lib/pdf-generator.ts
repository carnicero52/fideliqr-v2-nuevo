import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

interface PDFTableOptions {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: (string | number)[][];
  headerColor: string;
  alternateColor?: string;
  highlightRows?: number[]; // Row indices to highlight
  highlightColor?: string;
  totals?: string;
}

export async function generatePDF(options: PDFTableOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'letter',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20)
        .fillColor(options.headerColor)
        .font('Helvetica-Bold')
        .text(options.title, { align: 'left' });
      
      // Subtitle
      if (options.subtitle) {
        doc.fontSize(10)
          .fillColor('#666666')
          .font('Helvetica')
          .text(options.subtitle, { align: 'left' });
      }
      
      doc.moveDown(1.5);

      // Table
      const startX = doc.page.margins.left;
      let y = doc.y;
      const rowHeight = 24;
      const headerHeight = 28;

      // Calculate total width
      const totalWidth = options.columns.reduce((sum, col) => sum + col.width, 0);

      // Check if we need new page
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
          return true;
        }
        return false;
      };

      // Draw header
      doc.fillColor('#FFFFFF');
      doc.rect(startX, y, totalWidth, headerHeight)
        .fill(options.headerColor);
      
      doc.fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold');
      
      let x = startX;
      options.columns.forEach((col) => {
        const align = col.align || 'center';
        doc.text(col.header, x + 4, y + 8, {
          width: col.width - 8,
          align: align,
        });
        x += col.width;
      });
      
      y += headerHeight;

      // Draw rows
      doc.font('Helvetica').fontSize(8);
      options.rows.forEach((row, index) => {
        checkPageBreak(rowHeight);
        
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
        options.columns.forEach((col, colIndex) => {
          const value = String(row[colIndex] ?? '');
          const align = col.align || 'center';
          doc.text(value, x + 4, y + 7, {
            width: col.width - 8,
            align: align,
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
        doc.moveDown(1.5);
        doc.fontSize(10)
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

// Helper to format date
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
