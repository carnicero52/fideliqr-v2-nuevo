import { db } from '@/lib/db';
import crypto from 'crypto';

// Hash password simple con SHA256
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verificar password
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generar token de sesión
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Crear sesión de admin
export async function createAdminSession(negocioId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

  await db.adminSession.create({
    data: {
      negocioId,
      token,
      expiresAt,
    },
  });

  return token;
}

// Verificar sesión de admin
export async function verifyAdminSession(token: string): Promise<string | null> {
  const session = await db.adminSession.findUnique({
    where: { token },
    include: { negocio: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.adminSession.delete({ where: { token } });
    return null;
  }

  return session.negocioId;
}

// Eliminar sesión
export async function deleteAdminSession(token: string): Promise<void> {
  try {
    await db.adminSession.delete({ where: { token } });
  } catch {
    // Ignorar si no existe
  }
}
