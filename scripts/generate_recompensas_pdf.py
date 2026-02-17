#!/usr/bin/env python3
"""Generate recompensas PDF report for FideliQR"""
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
        title=f"Recompensas {negocio_nombre}",
        author="FideliQR",
        creator="FideliQR"
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#F59E0B'),
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
    story.append(Paragraph(f"Recompensas - {negocio_nombre}", title_style))
    story.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", subtitle_style))
    story.append(Spacer(1, 12))
    
    # Table data
    data = [
        [
            Paragraph('<b>Cliente</b>', header_style),
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
    col_widths = [1.8*inch, 1.8*inch, 1.0*inch, 0.9*inch, 0.9*inch, 0.9*inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F59E0B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    # Add colors - highlight pending rewards
    for i in range(1, len(data)):
        pendientes = clientes[i-1].get('recompensasPendientes', 0)
        if pendientes > 0:
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FCD34D')),
            ]))
        elif i % 2 == 0:
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FEF3C7')),
            ]))
    
    story.append(table)
    
    # Totals
    story.append(Spacer(1, 24))
    total_pendientes = sum(c.get('recompensasPendientes', 0) for c in clientes)
    total_canjeadas = sum(c.get('recompensasCanjeadas', 0) for c in clientes)
    story.append(Paragraph(
        f"<b>Clientes con recompensas:</b> {len(clientes)} | "
        f"<b>Pendientes:</b> {total_pendientes} | "
        f"<b>Canjeadas:</b> {total_canjeadas}",
        styles['Normal']
    ))
    
    doc.build(story)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_recompensas_pdf.py <output_path> <clientes_json>", file=sys.stderr)
        sys.exit(1)
    
    output_path = sys.argv[1]
    clientes = json.loads(sys.argv[2])
    negocio_nombre = sys.argv[3] if len(sys.argv) > 3 else "Negocio"
    
    generate_pdf(output_path, clientes, negocio_nombre)
    print(output_path)
