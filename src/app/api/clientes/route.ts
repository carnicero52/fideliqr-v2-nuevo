import { db } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

// GET - Listar clientes de un negocio
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const negocioId = searchParams.get('negocioId');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  if (!negocioId) {
    return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
  }

  try {
    // Obtener clientes
    const clientes = await db.cliente.findMany({
      where: { negocioId, activo: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    // Contar total
    const total = await db.cliente.count({ where: { negocioId, activo: true } });

    return NextResponse.json({
      clientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listando clientes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
