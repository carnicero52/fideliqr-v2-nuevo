#!/usr/bin/env python3
"""Generate clientes PDF report for FideliQR"""
import sys
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

def generate_pdf(output_path, clientes, negocio_nombre):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        title=f"Clientes {negocio_nombre}",
        author="FideliQR",
        creator="FideliQR"
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.gray,
        spaceAfter=24
    )
    
    header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.white,
        alignment=TA_CENTER
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=9,
        alignment=TA_CENTER
    )
    
    cell_left = ParagraphStyle(
        'TableCellLeft',
        fontName='Helvetica',
        fontSize=9,
        alignment=TA_LEFT
    )
    
    story = []
    
    # Title
    story.append(Paragraph(f"Clientes - {negocio_nombre}", title_style))
    story.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", subtitle_style))
    story.append(Spacer(1, 12))
    
    # Table data
    data = [
        [
            Paragraph('<b>Nombre</b>', header_style),
            Paragraph('<b>Email</b>', header_style),
            Paragraph('<b>Tel.</b>', header_style),
            Paragraph('<b>Compras</b>', header_style),
            Paragraph('<b>Pend.</b>', header_style),
            Paragraph('<b>Canj.</b>', header_style),
        ]
    ]
    
    for c in clientes:
        data.append([
            Paragraph(str(c.get('nombre', '')), cell_left),
            Paragraph(str(c.get('email', '')), cell_left),
            Paragraph(str(c.get('telefono', '-')), cell_style),
            Paragraph(str(c.get('comprasTotal', 0)), cell_style),
            Paragraph(str(c.get('recompensasPendientes', 0)), cell_style),
            Paragraph(str(c.get('recompensasCanjeadas', 0)), cell_style),
        ])
    
    # Create table
    col_widths = [1.8*inch, 1.8*inch, 1.0*inch, 0.8*inch, 0.8*inch, 0.8*inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F46E5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    # Add alternating colors for all rows
    for i in range(1, len(data)):
        if i % 2 == 0:
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F5F5F5')),
            ]))
    
    story.append(table)
    
    # Total
    story.append(Spacer(1, 24))
    story.append(Paragraph(f"<b>Total de clientes:</b> {len(clientes)}", styles['Normal']))
    
    doc.build(story)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_clientes_pdf.py <output_path> <clientes_json>", file=sys.stderr)
        sys.exit(1)
    
    output_path = sys.argv[1]
    clientes = json.loads(sys.argv[2])
    negocio_nombre = sys.argv[3] if len(sys.argv) > 3 else "Negocio"
    
    generate_pdf(output_path, clientes, negocio_nombre)
    print(output_path)
