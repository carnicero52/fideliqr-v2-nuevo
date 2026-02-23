import { db } from '@/lib/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Hash password con bcrypt (más seguro)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Hash password con SHA256 (para compatibilidad)
export function hashPasswordSHA256(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verificar password (soporta bcrypt y SHA256)
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Si es bcrypt (empieza con $2b$ o $2a$)
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
    return bcrypt.compare(password, hash);
  }
  // Si es SHA256 (formato antiguo)
  return hashPasswordSHA256(password) === hash;
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
