import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, hasEmailConfig } from '@/lib/notifications';

// GET - Verificar configuración de email
export async function GET(request: NextRequest) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT || '587';
  
  return NextResponse.json({
    configured: hasEmailConfig(),
    config: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser ? `${smtpUser.substring(0, 3)}***@${smtpUser.split('@')[1] || '...'}` : 'No configurado',
      pass: smtpPass ? '✅ Configurado' : '❌ No configurado',
    }
  });
}

// POST - Enviar email de prueba
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }
    
    if (!hasEmailConfig()) {
      return NextResponse.json({ 
        error: 'SMTP no configurado',
        hint: 'Agrega SMTP_USER y SMTP_PASS en las variables de entorno de Vercel'
      }, { status: 400 });
    }
    
    const result = await sendEmail({
      to: email,
      subject: '🧪 Prueba de FideliQR - Email funcionando',
      text: '¡Excelente! Las notificaciones de FideliQR están funcionando correctamente.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">✅ Email de Prueba - FideliQR</h2>
          <p>¡Excelente! Las notificaciones de FideliQR están funcionando correctamente.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">Este es un email de prueba enviado desde tu panel de administración.</p>
        </div>
      `
    });
    
    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: `Email enviado exitosamente a ${email}` 
      });
    } else {
      return NextResponse.json({ 
        error: 'Error al enviar email. Revisa los logs del servidor.' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error en test-email:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
