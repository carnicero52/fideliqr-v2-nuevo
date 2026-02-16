import { db } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewClienteToOwner } from '@/lib/notifications';
import { telegramNotifyNewCliente } from '@/lib/telegram';

// GET - Listar clientes de un negocio (requiere auth admin)
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
    const where: any = { negocioId, activo: true };
    
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { email: { contains: search } },
        { telefono: { contains: search } },
      ];
    }

    const [clientes, total] = await Promise.all([
      db.cliente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { compras: true },
          },
          compras: {
            orderBy: { fecha: 'desc' },
            take: 1,
            select: {
              fecha: true,
              compraNumero: true,
            },
          },
        },
      }),
      db.cliente.count({ where }),
    ]);

    // Transformar los datos para incluir última compra
    const clientesConUltimaCompra = clientes.map(cliente => ({
      ...cliente,
      ultimaCompra: cliente.compras[0]?.fecha || null,
      compras: undefined, // Remover el array completo
    }));

    return NextResponse.json({
      clientes: clientesConUltimaCompra,
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

// POST - Registrar nuevo cliente (público)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { negocioId, nombre, email, telefono } = body;

    if (!negocioId || !nombre || !email) {
      return NextResponse.json(
        { error: 'Negocio, nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el negocio existe
    const negocio = await db.negocio.findUnique({
      where: { id: negocioId },
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe el cliente con ese email en este negocio
    const existente = await db.cliente.findUnique({
      where: {
        negocioId_email: { negocioId, email },
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este email en este negocio' },
        { status: 400 }
      );
    }

    // Generar código QR único para el cliente
    const qrCodigo = `QR-${negocioId.substring(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    // Crear cliente
    const cliente = await db.cliente.create({
      data: {
        negocioId,
        nombre,
        email,
        telefono: telefono || null,
        qrCodigo,
        comprasTotal: 0,
      },
    });

    // Enviar notificaciones al dueño (async, no bloquear respuesta)
    Promise.all([
      notifyNewClienteToOwner({
        ownerEmail: negocio.emailDestino,
        negocioNombre: negocio.nombre,
        clienteNombre: nombre,
        clienteEmail: email,
        clienteTelefono: telefono,
      }),
      negocio.telegramActivo && negocio.telegramToken && negocio.telegramChatId
        ? telegramNotifyNewCliente({
            token: negocio.telegramToken,
            chatId: negocio.telegramChatId,
            negocioNombre: negocio.nombre,
            clienteNombre: nombre,
            clienteEmail: email,
          })
        : Promise.resolve(),
    ]).catch(console.error);

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
      },
    });
  } catch (error) {
    console.error('Error registrando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
