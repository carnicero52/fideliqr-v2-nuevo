'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  QrCode, 
  Gift, 
  Users, 
  Bell, 
  CheckCircle, 
  ArrowRight,
  Store,
  UserPlus,
  Smartphone,
  Scan
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    direccion: '',
  });
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Iniciando registro...', { nombre: formData.nombre, email: formData.email });
    
    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Contraseñas no coinciden');
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      console.log('❌ Contraseña muy corta');
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    console.log('🔄 Enviando petición al servidor...');

    try {
      const response = await fetch('/api/negocio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          emailDestino: formData.email,
          password: formData.password,
          telefono: formData.telefono || undefined,
          direccion: formData.direccion || undefined,
        }),
      });

      const data = await response.json();
      console.log('📡 Respuesta del servidor:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar');
      }

      console.log('✅ Registro exitoso!');
      toast({
        title: '¡Registro exitoso!',
        description: 'Tu negocio ha sido registrado. Redirigiendo al panel...',
      });

      setTimeout(() => {
        console.log('🔄 Redirigiendo a /admin...');
        window.location.href = '/admin';
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar el negocio',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">FideliQR</span>
              <span className="text-violet-600 text-sm ml-1">v2</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/cliente">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Soy cliente</span>
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Acceder</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Gift className="w-4 h-4" />
              Sistema de Fidelización Digital
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Premia a tus clientes{' '}
              <span className="text-violet-600">leales</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-4">
              <strong>El cliente tiene su QR personal.</strong> Tú escaneas y sumas compras automáticamente.
            </p>
            <p className="text-base text-muted-foreground mb-8">
              Sistema simplificado donde cada cliente tiene su código único. Escanea con tu teléfono o PC y listo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#registro">
                <Button size="lg" className="gap-2 bg-violet-600 hover:bg-violet-700">
                  Registrar mi negocio
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#como-funciona">
                <Button size="lg" variant="outline">
                  ¿Cómo funciona?
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Todo lo que necesitas para fidelizar
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Registro de Clientes</h3>
                <p className="text-muted-foreground">Registra a tus clientes desde el panel y recibe su QR personal automáticamente.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">QR Personal</h3>
                <p className="text-muted-foreground">Cada cliente tiene su código QR único que tú escaneas en cada compra.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Recompensas Automáticas</h3>
                <p className="text-muted-foreground">Cada 10 compras, el cliente gana una recompensa automáticamente.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Notificaciones</h3>
                <p className="text-muted-foreground">Recibe alertas por Email y Telegram de nuevas compras y recompensas.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Registra tu negocio</h3>
              <p className="text-sm text-muted-foreground">Crea tu cuenta en segundos con los datos básicos.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Agrega clientes</h3>
              <p className="text-sm text-muted-foreground">Registra clientes desde el panel. Ellos reciben su QR por email.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Escanea el QR</h3>
              <p className="text-sm text-muted-foreground">Cuando el cliente compra, escaneas su QR y suma automáticamente.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="font-semibold mb-2">¡Listo!</h3>
              <p className="text-sm text-muted-foreground">El cliente acumula compras y recibe recompensas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified Flow */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Flujo Simplificado</CardTitle>
                <CardDescription>El cliente tiene su QR, tú escaneas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">1. Registro de clientes</h3>
                    <p className="text-sm text-muted-foreground">El dueño registra a los clientes desde el panel. El cliente recibe su QR personal por email.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Scan className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">2. Escanea el QR</h3>
                    <p className="text-sm text-muted-foreground">Cuando el cliente compra, tú escaneas su QR personal con tu teléfono o PC. El sistema suma automáticamente.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">3. Recompensas automáticas</h3>
                    <p className="text-sm text-muted-foreground">Cada 10 compras, el sistema activa una recompensa y notifica al cliente y al dueño.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">4. Canje de recompensas</h3>
                    <p className="text-sm text-muted-foreground">El cliente presenta su QR y el dueño canjea la recompensa desde el panel.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Registration */}
      <section id="registro" className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Registra tu negocio</CardTitle>
                <CardDescription>Comienza a premiar a tus clientes en menos de 2 minutos</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del negocio *</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Café del Centro"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (para login y notificaciones) *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repetir contraseña"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono (opcional)</Label>
                    <Input
                      id="telefono"
                      placeholder="+52 55 1234 5678"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección (opcional)</Label>
                    <Input
                      id="direccion"
                      placeholder="Calle 123, Col. Centro"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Registrando...' : 'Registrar negocio'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">FideliQR <span className="text-violet-600">v2</span></span>
          </div>
          <p className="text-sm">Sistema de fidelización digital. El cliente tiene su QR personal.</p>
        </div>
      </footer>
    </div>
  );
}
