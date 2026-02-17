'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QrCode, ShoppingBag, CheckCircle, Gift, Store, Shield, Clock, AlertTriangle, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Negocio {
  id: string;
  nombre: string;
  direccion?: string;
}

interface CompraResult {
  compraNumero: number;
  esRecompensa: boolean;
}

interface ClienteResult {
  nombre: string;
  comprasTotal: number;
  recompensaAlcanzada: boolean;
}

// Clave para sessionStorage
const SESSION_KEY_PREFIX = 'fideliqr_compra_';
const COOLDOWN_MINUTOS = 60; // 1 hora de bloqueo

function ScanContent() {
  const searchParams = useSearchParams();
  const negocioId = searchParams.get('negocio');
  
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [compraResult, setCompraResult] = useState<{
    compra: CompraResult;
    cliente: ClienteResult;
  } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (negocioId) {
      fetchNegocio();
      checkSessionBlock();
    } else {
      setIsLoading(false);
    }
  }, [negocioId]);

  // Verificar si hay una compra reciente en sessionStorage
  const checkSessionBlock = () => {
    if (!negocioId) return;
    
    const sessionKey = SESSION_KEY_PREFIX + negocioId;
    const lastPurchaseStr = sessionStorage.getItem(sessionKey);
    
    if (lastPurchaseStr) {
      try {
        const lastPurchase = JSON.parse(lastPurchaseStr);
        const now = Date.now();
        const timeDiff = now - lastPurchase.timestamp;
        const COOLDOWN_MS = COOLDOWN_MINUTOS * 60 * 1000; // 60 minutos
        
        if (timeDiff < COOLDOWN_MS) {
          // Si el backend ya registró la compra, mostrarla
          setCompraResult(lastPurchase.result);
          setIsBlocked(true);
          
          const minutosRestantes = Math.ceil((COOLDOWN_MS - timeDiff) / (60 * 1000));
          setBlockedReason(`Debes esperar ${minutosRestantes} minutos para registrar otra compra.`);
        } else {
          // Limpiar sessionStorage si ya pasó el tiempo
          sessionStorage.removeItem(sessionKey);
        }
      } catch (e) {
        sessionStorage.removeItem(sessionKey);
      }
    }
  };

  const fetchNegocio = async () => {
    try {
      const response = await fetch(`/api/negocio?id=${negocioId}`);
      const data = await response.json();
      
      if (response.ok) {
        setNegocio(data.negocio);
      } else {
        toast({
          title: 'Error',
          description: 'Negocio no encontrado',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar la información',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar bloqueo local antes de enviar
    if (isBlocked || compraResult) {
      setBlockedReason('Ya has registrado una compra recientemente. Espera a tu próxima visita.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: negocio?.id,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar error de cooldown
        if (response.status === 429 || data.cooldown) {
          setBlockedReason(data.error || 'Debes esperar antes de registrar otra compra');
          setIsBlocked(true);
          toast({
            title: '⏳ Espera un momento',
            description: data.error,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || 'Error al registrar compra');
      }

      setCompraResult(data);
      
      // Guardar en sessionStorage para evitar refrescos
      const sessionKey = SESSION_KEY_PREFIX + negocioId;
      sessionStorage.setItem(sessionKey, JSON.stringify({
        timestamp: Date.now(),
        result: data,
        email: email
      }));
      
      if (data.cliente.recompensaAlcanzada) {
        toast({
          title: '🎁 ¡Felicidades!',
          description: `${data.cliente.nombre} ha ganado una recompensa!`,
        });
      } else {
        toast({
          title: '✅ Compra registrada',
          description: `Compra #${data.compra.compraNumero} registrada correctamente`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular progreso hacia la recompensa
  const calculateProgress = (total: number) => {
    return (total % 10) * 10;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-200" />
          <div className="h-4 w-32 bg-emerald-200 rounded" />
        </div>
      </div>
    );
  }

  if (!negocioId || !negocio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-background p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">QR no válido</h2>
            <p className="text-muted-foreground">
              El código QR que escaneaste no es válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">{negocio.nombre}</CardTitle>
          <CardDescription>
            {compraResult ? 'Compra registrada' : 'Acumula tu compra'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compraResult ? (
            // Vista después de registrar la compra - SIN BOTÓN DE AGREGAR MÁS
            <div className="text-center space-y-6">
              {compraResult.cliente.recompensaAlcanzada ? (
                <div className="py-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-amber-600 mb-2">
                    ¡Felicidades {compraResult.cliente.nombre}!
                  </h3>
                  <p className="text-lg mb-2">
                    Has alcanzado <strong>{compraResult.cliente.comprasTotal} compras</strong>
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                    <p className="text-amber-800 font-medium">
                      🎁 ¡Tienes una recompensa pendiente!
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      Muéstrale esta pantalla al encargado para canjearla.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    ¡Gracias {compraResult.cliente.nombre}!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Compra #{compraResult.compra.compraNumero} registrada correctamente
                  </p>
                  
                  {/* Barra de progreso hacia recompensa */}
                  <div className="bg-muted rounded-xl p-4 mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progreso hacia recompensa</span>
                      <span className="font-medium text-emerald-600">
                        {compraResult.cliente.comprasTotal % 10} / 10
                      </span>
                    </div>
                    <Progress 
                      value={calculateProgress(compraResult.cliente.comprasTotal)} 
                      className="h-3"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {10 - (compraResult.cliente.comprasTotal % 10)} compras más para tu próxima recompensa
                    </p>
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
                    <p className="text-emerald-800 font-medium text-sm">
                      📊 Total de compras: <strong>{compraResult.cliente.comprasTotal}</strong>
                    </p>
                  </div>
                </div>
              )}
              
              {/* Mensaje de seguridad - SIN BOTÓN */}
              <div className="bg-muted/50 border rounded-xl p-4 mt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Sistema seguro</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo el encargado puede registrar compras escaneando el QR oficial. 
                      Presenta tu código en tu próxima visita.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-1" />
                Registro completado • {new Date().toLocaleTimeString('es-ES')}
              </p>
            </div>
          ) : (
            // Formulario para ingresar email
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Registro seguro
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  El encargado te mostrará este QR para registrar tu compra. 
                  Ingresa tu email para continuar.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email del cliente</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="text-lg"
                />
              </div>
              
              {/* Mostrar error de bloqueo si existe */}
              {blockedReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium text-red-800 text-sm">Acción bloqueada</p>
                      <p className="text-xs text-red-700 mt-1">{blockedReason}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isSubmitting || isBlocked}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2 animate-pulse" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Registrar compra
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-200" />
          <div className="h-4 w-32 bg-emerald-200 rounded" />
        </div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
