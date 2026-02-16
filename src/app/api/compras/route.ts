import { db } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';
import { notifyRewardToCliente, sendEmail } from '@/lib/notifications';
import { telegramNotifyReward, telegramNotifyCompra } from '@/lib/telegram';

const COMPRAS_PARA_RECOMPENSA = 10;
const COOLDOWN_MINUTOS = 60; // Minutos mínimos entre compras del mismo cliente (1 hora)
const COOLDOWN_MS = COOLDOWN_MINUTOS * 60 * 1000;

// GET - Historial de compras de un cliente
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get('clienteId');
  const negocioId = searchParams.get('negocioId');

  if (!negocioId) {
    return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
  }

  try {
    const where: { negocioId: string; clienteId?: string } = { negocioId };

    if (clienteId) {
      where.clienteId = clienteId;
    }

    const compras = await db.compra.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: 100,
      include: {
        cliente: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    return NextResponse.json({ compras });
  } catch (error) {
    console.error('Error obteniendo compras:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST - Sumar una compra (V2: El negocio escanea el QR del cliente)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { negocioId, email, qrCodigo } = body;

    // V2: Aceptar qrCodigo O email para encontrar al cliente
    if (!negocioId || (!email && !qrCodigo)) {
      return NextResponse.json(
        { error: 'Negocio y código QR o email son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el negocio
    const negocio = await db.negocio.findUnique({
      where: { id: negocioId },
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // Buscar el cliente por QR o por email
    let cliente;
    if (qrCodigo) {
      // V2: Buscar por código QR único
      cliente = await db.cliente.findUnique({
        where: { qrCodigo },
      });
      
      // Verificar que el cliente pertenece a este negocio
      if (cliente && cliente.negocioId !== negocioId) {
        return NextResponse.json(
          { error: 'Este cliente no pertenece a tu negocio' },
          { status: 403 }
        );
      }
    } else {
      // V1 fallback: Buscar por email y negocio
      cliente = await db.cliente.findUnique({
        where: {
          negocioId_email: { negocioId, email },
        },
      });
    }

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado. El código QR no es válido.' },
        { status: 404 }
      );
    }

    // VERIFICAR SI EL CLIENTE ESTÁ BLOQUEADO
    if (cliente.bloqueado) {
      return NextResponse.json(
        { 
          error: `Cliente bloqueado. Motivo: ${cliente.motivoBloqueo || 'Sin especificar'}`,
          bloqueado: true 
        },
        { status: 403 }
      );
    }

    // VERIFICAR COOLDOWN - Evitar compras muy seguidas
    const ultimaCompra = await db.compra.findFirst({
      where: { clienteId: cliente.id },
      orderBy: { fecha: 'desc' },
      select: { fecha: true },
    });

    if (ultimaCompra) {
      const tiempoTranscurrido = Date.now() - new Date(ultimaCompra.fecha).getTime();
      const minutosTranscurridos = Math.floor(tiempoTranscurrido / (60 * 1000));
      
      if (tiempoTranscurrido < COOLDOWN_MS) {
        const minutosRestantes = COOLDOWN_MINUTOS - minutosTranscurridos;
        return NextResponse.json(
          { 
            error: `Debes esperar ${minutosRestantes} minutos antes de registrar otra compra`,
            cooldown: true,
            minutosRestantes,
            cooldownMinutos: COOLDOWN_MINUTOS
          },
          { status: 429 }
        );
      }
    }

    // Incrementar contador de compras
    const nuevasCompras = cliente.comprasTotal + 1;
    const esRecompensa = nuevasCompras % COMPRAS_PARA_RECOMPENSA === 0;

    // Crear la compra y actualizar cliente en transacción
    const [compra] = await db.$transaction([
      db.compra.create({
        data: {
          clienteId: cliente.id,
          negocioId: negocio.id,
          compraNumero: nuevasCompras,
          esRecompensa,
        },
      }),
      db.cliente.update({
        where: { id: cliente.id },
        data: {
          comprasTotal: nuevasCompras,
          recompensasPendientes: esRecompensa
            ? cliente.recompensasPendientes + 1
            : cliente.recompensasPendientes,
        },
      }),
    ]);

    // ENVIAR NOTIFICACIONES
    console.log('📦 Compra registrada:', {
      negocio: negocio.nombre,
      cliente: cliente.nombre,
      compra: nuevasCompras,
      esRecompensa
    });

    // Notificar por Telegram
    if (negocio.telegramActivo && negocio.telegramToken && negocio.telegramChatId) {
      if (esRecompensa) {
        telegramNotifyReward({
          token: negocio.telegramToken,
          chatId: negocio.telegramChatId,
          negocioNombre: negocio.nombre,
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          comprasTotal: nuevasCompras,
        }).catch(err => console.error('Telegram error:', err));
      } else {
        telegramNotifyCompra({
          token: negocio.telegramToken,
          chatId: negocio.telegramChatId,
          negocioNombre: negocio.nombre,
          clienteNombre: cliente.nombre,
          compraNumero: nuevasCompras,
        }).catch(err => console.error('Telegram error:', err));
      }
    }

    // Notificar por Email al dueño
    try {
      await sendEmail({
        to: negocio.emailDestino,
        subject: esRecompensa 
          ? `🎁 ¡Recompensa! - ${cliente.nombre}`
          : `🛒 Compra #${nuevasCompras} - ${cliente.nombre}`,
        text: esRecompensa
          ? `${cliente.nombre} ha alcanzado ${nuevasCompras} compras.`
          : `Compra #${nuevasCompras} de ${cliente.nombre}`,
        html: esRecompensa
          ? `<h2>🎁 Recompensa</h2><p><strong>${cliente.nombre}</strong> - ${nuevasCompras} compras</p>`
          : `<h2>🛒 Compra #${nuevasCompras}</h2><p><strong>${cliente.nombre}</strong></p>`,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    // Notificar al cliente si hay recompensa
    if (esRecompensa) {
      notifyRewardToCliente({
        clienteEmail: cliente.email,
        clienteNombre: cliente.nombre,
        negocioNombre: negocio.nombre,
        comprasTotal: nuevasCompras,
      }).catch(err => console.error('Email cliente error:', err));
    }

    return NextResponse.json({
      success: true,
      compra: {
        id: compra.id,
        compraNumero: compra.compraNumero,
        esRecompensa: compra.esRecompensa,
      },
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        comprasTotal: nuevasCompras,
        recompensasPendientes: esRecompensa 
          ? cliente.recompensasPendientes + 1 
          : cliente.recompensasPendientes,
        recompensaAlcanzada: esRecompensa,
      },
    });
  } catch (error) {
    console.error('Error registrando compra:', error);
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
