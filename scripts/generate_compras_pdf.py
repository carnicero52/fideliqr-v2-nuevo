#!/usr/bin/env python3
"""Generate compras PDF report for FideliQR"""
import sys
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

def generate_pdf(output_path, compras, negocio_nombre):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(letter),
        title=f"Compras {negocio_nombre}",
        author="FideliQR",
        creator="FideliQR"
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#3B82F6'),
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
    story.append(Paragraph(f"Compras - {negocio_nombre}", title_style))
    story.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", subtitle_style))
    story.append(Spacer(1, 12))
    
    # Table data
    data = [
        [
            Paragraph('<b>Fecha</b>', header_style),
            Paragraph('<b>N Compra</b>', header_style),
            Paragraph('<b>Recompensa</b>', header_style),
            Paragraph('<b>Cliente</b>', header_style),
            Paragraph('<b>Email</b>', header_style),
            Paragraph('<b>Tel.</b>', header_style),
        ]
    ]
    
    for c in compras:
        es_recompensa = c.get('esRecompensa', 0) == 1 or c.get('esRecompensa') == True
        fecha = c.get('fecha', '')
        try:
            fecha = datetime.fromisoformat(fecha.replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')
        except:
            pass
        
        data.append([
            Paragraph(str(fecha), cell_style),
            Paragraph(str(c.get('compraNumero', 0)), cell_style),
            Paragraph('Si' if es_recompensa else 'No', cell_style),
            Paragraph(str(c.get('clienteNombre', '')), cell_left),
            Paragraph(str(c.get('clienteEmail', '')), cell_left),
            Paragraph(str(c.get('clienteTelefono', '-')), cell_style),
        ])
    
    # Create table
    col_widths = [1.5*inch, 1.0*inch, 1.0*inch, 1.8*inch, 2.0*inch, 1.2*inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    # Add alternating colors
    for i in range(1, len(data)):
        if compras[i-1].get('esRecompensa'):
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FEF3C7')),
            ]))
        elif i % 2 == 0:
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F5F5F5')),
            ]))
    
    story.append(table)
    
    # Total
    story.append(Spacer(1, 24))
    total_recompensas = sum(1 for c in compras if c.get('esRecompensa'))
    story.append(Paragraph(f"<b>Total de compras:</b> {len(compras)} | <b>Recompensas:</b> {total_recompensas}", styles['Normal']))
    
    doc.build(story)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_compras_pdf.py <output_path> <compras_json>", file=sys.stderr)
        sys.exit(1)
    
    output_path = sys.argv[1]
    compras = json.loads(sys.argv[2])
    negocio_nombre = sys.argv[3] if len(sys.argv) > 3 else "Negocio"
    
    generate_pdf(output_path, compras, negocio_nombre)
    print(output_path)
