import { db } from '@/lib/database';
import { verifyAdminSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewClienteToOwner, sendEmail } from '@/lib/notifications';
import { telegramNotifyNewCliente, getDefaultTelegramConfig } from '@/lib/telegram';

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
    // Obtener configuración de Telegram (de BD o variables de entorno)
    const defaultTelegram = getDefaultTelegramConfig();
    const telegramToken = (negocio as any).telegramToken || defaultTelegram.token;
    const telegramChatId = (negocio as any).telegramChatId || defaultTelegram.chatId;
    
    console.log('📤 Notificaciones - Nuevo cliente:', {
      emailDestino: negocio.emailDestino,
      telegram: telegramToken ? 'configurado' : 'no configurado'
    });

    // Notificar por Email al dueño
    sendEmail({
      to: negocio.emailDestino,
      subject: `🎉 Nuevo cliente registrado - ${negocio.nombre}`,
      text: `¡Tienes un nuevo cliente!\n\nNombre: ${nombre}\nEmail: ${email}${telefono ? `\nTeléfono: ${telefono}` : ''}`,
      html: `<h2>🎉 ¡Nuevo cliente registrado!</h2><p><strong>Nombre:</strong> ${nombre}</p><p><strong>Email:</strong> ${email}</p>${telefono ? `<p><strong>Teléfono:</strong> ${telefono}</p>` : ''}`,
    }).then(result => console.log('📧 Email nuevo cliente:', result ? '✅ Enviado' : '❌ Falló'))
      .catch(err => console.error('❌ Email error:', err));

    // Notificar por Telegram
    if (telegramToken && telegramChatId) {
      telegramNotifyNewCliente({
        token: telegramToken,
        chatId: telegramChatId,
        negocioNombre: negocio.nombre,
        clienteNombre: nombre,
        clienteEmail: email,
      }).then(() => console.log('✅ Telegram nuevo cliente enviado'))
        .catch(err => console.error('❌ Telegram error:', err));
    }

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
