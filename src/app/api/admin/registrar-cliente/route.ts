import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewClienteToOwner } from '@/lib/notifications';
import { telegramNotifyNewCliente } from '@/lib/telegram';

// POST - Registrar cliente manualmente desde el panel admin
export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const negocioId = await verifyAdminSession(token);

  if (!negocioId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, email, telefono, comprasIniciales } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
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
        { error: 'Ya existe un cliente con este email' },
        { status: 400 }
      );
    }

    // Calcular compras iniciales y recompensas
    const comprasTotal = comprasIniciales || 0;
    const recompensasPendientes = Math.floor(comprasTotal / 10);

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
        comprasTotal,
        recompensasPendientes,
      },
    });

    // Si hay compras iniciales, registrarlas
    if (comprasTotal > 0) {
      for (let i = 1; i <= comprasTotal; i++) {
        await db.compra.create({
          data: {
            clienteId: cliente.id,
            negocioId: negocio.id,
            compraNumero: i,
            esRecompensa: i % 10 === 0,
          },
        });
      }
    }

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
        qrCodigo: cliente.qrCodigo,
        comprasTotal: cliente.comprasTotal,
        recompensasPendientes: cliente.recompensasPendientes,
      },
    });
  } catch (error) {
    console.error('Error registrando cliente:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
