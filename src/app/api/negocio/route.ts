import { db } from '@/lib/db';
import { hashPassword, createAdminSession } from '@/lib/auth';
import { generateQRCodeDataURL, getQRUrlForNegocio } from '@/lib/qrcode';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obtener negocio por ID (público, para mostrar info en registro/scan)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');

  try {
    let negocio;
    if (id) {
      negocio = await db.negocio.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          slug: true,
          telefono: true,
          direccion: true,
          descripcion: true,
          logoUrl: true,
        },
      });
    } else if (slug) {
      negocio = await db.negocio.findUnique({
        where: { slug },
        select: {
          id: true,
          nombre: true,
          slug: true,
          telefono: true,
          direccion: true,
          descripcion: true,
          logoUrl: true,
        },
      });
    }

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ negocio });
  } catch (error) {
    console.error('Error obteniendo negocio:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST - Crear nuevo negocio (registro inicial)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, emailDestino, password, telefono, direccion, descripcion } = body;

    // Validaciones
    if (!nombre || !emailDestino || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un negocio con ese email
    const existente = await db.negocio.findFirst({
      where: { emailDestino },
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un negocio registrado con este email' },
        { status: 400 }
      );
    }

    // Generar slug único
    const slugBase = nombre
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let slug = slugBase;
    let counter = 1;
    while (await db.negocio.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }

    // Hashear contraseña
    const hashedPassword = hashPassword(password);

    // Obtener URL base para el QR (usar variable de entorno o detectar del request)
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

    // Generar URL del QR
    const negocioId = crypto.randomUUID();
    const qrUrl = getQRUrlForNegocio(negocioId, baseUrl);

    // Obtener credenciales de Telegram por defecto desde variables de entorno
    const defaultTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const defaultTelegramChatId = process.env.TELEGRAM_CHAT_ID;

    // Crear negocio con Telegram pre-configurado si hay credenciales por defecto
    const negocio = await db.negocio.create({
      data: {
        id: negocioId,
        nombre,
        slug,
        emailDestino,
        password: hashedPassword,
        telefono: telefono || null,
        direccion: direccion || null,
        descripcion: descripcion || null,
        qrUrl,
        // Pre-configurar Telegram si hay credenciales en variables de entorno
        telegramToken: defaultTelegramToken || null,
        telegramChatId: defaultTelegramChatId || null,
        telegramActivo: !!(defaultTelegramToken && defaultTelegramChatId),
      },
    });

    // Generar QR como data URL
    const qrDataURL = await generateQRCodeDataURL(qrUrl);

    // Crear sesión de admin
    const token = await createAdminSession(negocio.id);

    const response = NextResponse.json({
      success: true,
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        emailDestino: negocio.emailDestino,
        qrUrl: negocio.qrUrl,
        qrDataURL,
      },
      token,
    });

    // Establecer cookie de sesión
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error creando negocio:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
