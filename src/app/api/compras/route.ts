import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { notifyRewardToCliente, notifyRewardToOwner, sendEmail } from '@/lib/notifications';
import { telegramNotifyReward, telegramNotifyCompra, sendTelegramMessage } from '@/lib/telegram';

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
    const where: any = { negocioId };

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

// POST - Sumar una compra (público, desde scan)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { negocioId, email } = body;

    if (!negocioId || !email) {
      return NextResponse.json(
        { error: 'Negocio y email son requeridos' },
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

    // Buscar el cliente
    const cliente = await db.cliente.findUnique({
      where: {
        negocioId_email: { negocioId, email },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado. Por favor regístrate primero.' },
        { status: 404 }
      );
    }

    // VERIFICAR SI EL CLIENTE ESTÁ BLOQUEADO
    if (cliente.bloqueado) {
      return NextResponse.json(
        { 
          error: `Tu cuenta está bloqueada. Motivo: ${cliente.motivoBloqueo || 'Sin especificar'}. Contacta al encargado.`,
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
          { status: 429 } // Too Many Requests
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

    // ENVIAR NOTIFICACIONES SIEMPRE (no solo en recompensas)
    console.log('📦 Enviando notificaciones...');
    console.log('   Negocio:', negocio.nombre);
    console.log('   Cliente:', cliente.nombre);
    console.log('   Compra #:', nuevasCompras);
    console.log('   Es recompensa:', esRecompensa);
    console.log('   Telegram activo:', negocio.telegramActivo);
    console.log('   Telegram token:', negocio.telegramToken ? 'Sí' : 'No');
    console.log('   Telegram chatId:', negocio.telegramChatId ? 'Sí' : 'No');

    // Notificar por Telegram (SIEMPRE que haya una compra)
    if (negocio.telegramActivo && negocio.telegramToken && negocio.telegramChatId) {
      console.log('   → Enviando notificación Telegram...');
      
      if (esRecompensa) {
        // Notificación especial de recompensa
        telegramNotifyReward({
          token: negocio.telegramToken,
          chatId: negocio.telegramChatId,
          negocioNombre: negocio.nombre,
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          comprasTotal: nuevasCompras,
        }).then(success => {
          console.log('   → Telegram recompensa:', success ? '✅ Enviado' : '❌ Error');
        }).catch(err => {
          console.error('   → Telegram error:', err);
        });
      } else {
        // Notificación de compra normal
        telegramNotifyCompra({
          token: negocio.telegramToken,
          chatId: negocio.telegramChatId,
          negocioNombre: negocio.nombre,
          clienteNombre: cliente.nombre,
          compraNumero: nuevasCompras,
        }).then(success => {
          console.log('   → Telegram compra:', success ? '✅ Enviado' : '❌ Error');
        }).catch(err => {
          console.error('   → Telegram error:', err);
        });
      }
    } else {
      console.log('   → Telegram no configurado');
    }

    // Notificar por Email al dueño (SIEMPRE)
    console.log('   → Enviando email al dueño:', negocio.emailDestino);
    try {
      const emailSuccess = await sendEmail({
        to: negocio.emailDestino,
        subject: esRecompensa 
          ? `🎁 ¡Recompensa alcanzada! - ${negocio.nombre}`
          : `🛒 Nueva compra #${nuevasCompras} - ${negocio.nombre}`,
        text: esRecompensa
          ? `¡Felicidades! ${cliente.nombre} ha alcanzado ${nuevasCompras} compras y tiene una recompensa pendiente.`
          : `Nueva compra registrada:\n\nCliente: ${cliente.nombre}\nEmail: ${cliente.email}\nCompra #${nuevasCompras}`,
        html: esRecompensa
          ? `<h2>🎁 ¡Recompensa alcanzada!</h2><p><strong>${cliente.nombre}</strong> ha alcanzado <strong>${nuevasCompras}</strong> compras.</p><p>Email: ${cliente.email}</p>`
          : `<h2>🛒 Nueva compra</h2><p><strong>Cliente:</strong> ${cliente.nombre}</p><p><strong>Email:</strong> ${cliente.email}</p><p><strong>Compra #${nuevasCompras}</strong></p>`,
      });
      console.log('   → Email dueño:', emailSuccess ? '✅ Enviado' : '❌ Error');
    } catch (emailError) {
      console.error('   → Email error:', emailError);
    }

    // Si alcanzó recompensa, notificar también al cliente por email
    if (esRecompensa) {
      console.log('   → Enviando email al cliente:', cliente.email);
      notifyRewardToCliente({
        clienteEmail: cliente.email,
        clienteNombre: cliente.nombre,
        negocioNombre: negocio.nombre,
        comprasTotal: nuevasCompras,
      }).catch(err => {
        console.error('   → Email cliente error:', err);
      });
    }

    return NextResponse.json({
      success: true,
      compra: {
        id: compra.id,
        compraNumero: compra.compraNumero,
        esRecompensa: compra.esRecompensa,
      },
      cliente: {
        nombre: cliente.nombre,
        comprasTotal: nuevasCompras,
        recompensaAlcanzada: esRecompensa,
      },
    });
  } catch (error) {
    console.error('Error registrando compra:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
