import { createClient } from '@libsql/client'

// Cliente de Turso
function createTursoClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken || !url.startsWith('libsql://')) {
    throw new Error('TURSO_DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos')
  }

  return createClient({ url, authToken })
}

// Cliente singleton
let client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!client) {
    client = createTursoClient()
  }
  return client
}

// Helper para ejecutar queries
export const db = {
  // Negocio operations
  negocio: {
    async findFirst(args: { where: { emailDestino?: string; id?: string; slug?: string } }) {
      const db = getClient()
      if (args.where.emailDestino) {
        const result = await db.execute({
          sql: 'SELECT * FROM Negocio WHERE emailDestino = ?',
          args: [args.where.emailDestino]
        })
        return result.rows[0] as any || null
      }
      if (args.where.id) {
        const result = await db.execute({
          sql: 'SELECT * FROM Negocio WHERE id = ?',
          args: [args.where.id]
        })
        return result.rows[0] as any || null
      }
      if (args.where.slug) {
        const result = await db.execute({
          sql: 'SELECT * FROM Negocio WHERE slug = ?',
          args: [args.where.slug]
        })
        return result.rows[0] as any || null
      }
      return null
    },

    async findUnique(args: { where: { id?: string; slug?: string } }) {
      return this.findFirst(args as any)
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO Negocio (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async update(args: { where: { id: string }; data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const updates = Object.keys(data).map(k => `${k} = ?`).join(', ')
      const values = [...Object.values(data), args.where.id]
      
      await db.execute({
        sql: `UPDATE Negocio SET ${updates} WHERE id = ?`,
        args: values as any[]
      })
      
      return { ...data, id: args.where.id }
    }
  },

  // Cliente operations
  cliente: {
    async findFirst(args: { where: { negocioId_email?: { negocioId: string; email: string }; qrCodigo?: string } }) {
      const db = getClient()
      if (args.where.qrCodigo) {
        const result = await db.execute({
          sql: 'SELECT * FROM Cliente WHERE qrCodigo = ?',
          args: [args.where.qrCodigo]
        })
        return result.rows[0] as any || null
      }
      if (args.where.negocioId_email) {
        const result = await db.execute({
          sql: 'SELECT * FROM Cliente WHERE negocioId = ? AND email = ?',
          args: [args.where.negocioId_email.negocioId, args.where.negocioId_email.email]
        })
        return result.rows[0] as any || null
      }
      return null
    },

    async findUnique(args: { where: { qrCodigo?: string; id?: string } }) {
      const db = getClient()
      if (args.where.qrCodigo) {
        const result = await db.execute({
          sql: 'SELECT * FROM Cliente WHERE qrCodigo = ?',
          args: [args.where.qrCodigo]
        })
        return result.rows[0] as any || null
      }
      if (args.where.id) {
        const result = await db.execute({
          sql: 'SELECT * FROM Cliente WHERE id = ?',
          args: [args.where.id]
        })
        return result.rows[0] as any || null
      }
      return null
    },

    async findMany(args: { where: { negocioId: string; activo?: boolean; bloqueado?: boolean }; orderBy?: { createdAt: string }; take?: number; skip?: number }) {
      const db = getClient()
      let sql = 'SELECT * FROM Cliente WHERE negocioId = ?'
      const params: any[] = [args.where.negocioId]
      
      if (args.where.activo !== undefined) {
        sql += ' AND activo = ?'
        params.push(args.where.activo ? 1 : 0)
      }
      if (args.where.bloqueado !== undefined) {
        sql += ' AND bloqueado = ?'
        params.push(args.where.bloqueado ? 1 : 0)
      }
      
      sql += ' ORDER BY createdAt DESC'
      
      if (args.take) {
        sql += ' LIMIT ?'
        params.push(args.take)
      }
      if (args.skip) {
        sql += ' OFFSET ?'
        params.push(args.skip)
      }
      
      const result = await db.execute({ sql, args: params })
      return result.rows as any[]
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO Cliente (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async update(args: { where: { id: string }; data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const updates = Object.keys(data).map(k => `${k} = ?`).join(', ')
      const values = [...Object.values(data), args.where.id]
      
      await db.execute({
        sql: `UPDATE Cliente SET ${updates} WHERE id = ?`,
        args: values as any[]
      })
      
      return { ...data, id: args.where.id }
    },

    async count(args: { where: { negocioId: string } }) {
      const db = getClient()
      const result = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM Cliente WHERE negocioId = ?',
        args: [args.where.negocioId]
      })
      return (result.rows[0] as any).count
    }
  },

  // Compra operations
  compra: {
    async findFirst(args: { where: { clienteId: string }; orderBy: { fecha: string }; select?: { fecha: boolean } }) {
      const db = getClient()
      const result = await db.execute({
        sql: 'SELECT * FROM Compra WHERE clienteId = ? ORDER BY fecha DESC LIMIT 1',
        args: [args.where.clienteId]
      })
      return result.rows[0] as any || null
    },

    async findMany(args: { where: { negocioId: string; clienteId?: string }; orderBy: { fecha: string }; take?: number; include?: { cliente: { select: Record<string, boolean> } } }) {
      const db = getClient()
      let sql = 'SELECT c.*, cl.nombre as cliente_nombre, cl.email as cliente_email FROM Compra c JOIN Cliente cl ON c.clienteId = cl.id WHERE c.negocioId = ?'
      const params: any[] = [args.where.negocioId]
      
      if (args.where.clienteId) {
        sql += ' AND c.clienteId = ?'
        params.push(args.where.clienteId)
      }
      
      sql += ' ORDER BY c.fecha DESC'
      
      if (args.take) {
        sql += ' LIMIT ?'
        params.push(args.take)
      }
      
      const result = await db.execute({ sql, args: params })
      return result.rows.map((r: any) => ({
        ...r,
        cliente: { nombre: r.cliente_nombre, email: r.cliente_email }
      }))
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO Compra (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async count(args: { where: { negocioId: string } }) {
      const db = getClient()
      const result = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM Compra WHERE negocioId = ?',
        args: [args.where.negocioId]
      })
      return (result.rows[0] as any).count
    }
  },

  // AdminSession operations
  adminSession: {
    async findUnique(args: { where: { token: string } }) {
      const db = getClient()
      const result = await db.execute({
        sql: 'SELECT * FROM AdminSession WHERE token = ?',
        args: [args.where.token]
      })
      return result.rows[0] as any || null
    },

    async create(args: { data: Record<string, any> }) {
      const db = getClient()
      const data = args.data
      const columns = Object.keys(data).join(', ')
      const placeholders = Object.keys(data).map(() => '?').join(', ')
      const values = Object.values(data)
      
      await db.execute({
        sql: `INSERT INTO AdminSession (${columns}) VALUES (${placeholders})`,
        args: values as any[]
      })
      
      return data
    },

    async deleteMany(args: { where: { negocioId: string } }) {
      const db = getClient()
      await db.execute({
        sql: 'DELETE FROM AdminSession WHERE negocioId = ?',
        args: [args.where.negocioId]
      })
    }
  },

  // AlertaSeguridad operations
  alertaSeguridad: {
    async findMany(args: { where: { negocioId: string; revisada?: boolean }; orderBy: { creadaEn: string } }) {
      const db = getClient()
      let sql = 'SELECT a.*, c.nombre as cliente_nombre, c.email as cliente_email FROM AlertaSeguridad a LEFT JOIN Cliente c ON a.clienteId = c.id WHERE a.negocioId = ?'
      const params: any[] = [args.where.negocioId]
      
      if (args.where.revisada !== undefined) {
        sql += ' AND a.revisada = ?'
        params.push(args.where.revisada ? 1 : 0)
      }
      
      sql += ' ORDER BY a.creadaEn DESC'
      
      const result = await db.execute({ sql, args: params })
      return result.rows.map((r: any) => ({
        ...r,
        cliente: r.clienteId ? { nombre: r.cliente_nombre, email: r.cliente_email } : null
      }))
    }
  },

  // Transaction helper
  async $transaction(operations: Promise<any>[]) {
    const results = []
    for (const op of operations) {
      results.push(await op)
    }
    return results
  }
}
