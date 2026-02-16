'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  QrCode, 
  Store,
  Users,
  ShoppingBag,
  Gift,
  Settings,
  LogOut,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  Camera,
  UserPlus,
  Eye,
  Award,
  Download,
  Shield,
  Ban,
  AlertTriangle,
  Scan,
  Bell,
  Mail,
  MessageSquare,
  Save
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Negocio {
  id: string;
  nombre: string;
  slug: string;
  emailDestino: string;
  telefono?: string;
  direccion?: string;
  qrUrl: string;
}

interface Config {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  descripcion?: string;
  notifEmailActivo: boolean;
  notifEmailRemitente?: string;
  notifEmailAsunto?: string;
  notifEmailMensaje?: string;
  notifTelegramActivo: boolean;
  notifTelegramToken?: string;
  notifTelegramChatId?: string;
  recompensaComprasNecesarias: number;
  recompensaDescripcion?: string;
  recompensaMensaje?: string;
  recompensaVigenciaDias: number;
}

interface Stats {
  totalClientes: number;
  totalCompras: number;
  recompensasPendientes: number;
  recompensasCanjeadas: number;
}

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  comprasTotal: number;
  recompensasPendientes: number;
  recompensasCanjeadas: number;
  createdAt: string;
  ultimaCompra?: string | null;
  qrCodigo?: string;
}

interface Compra {
  id: string;
  fecha: string;
  compraNumero: number;
  esRecompensa: boolean;
  cliente: {
    nombre: string;
    email: string;
  };
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Config state
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Nuevo cliente state
  const [showNuevoClienteDialog, setShowNuevoClienteDialog] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    email: '',
    telefono: '',
    comprasIniciales: 0,
  });
  const [isCreatingCliente, setIsCreatingCliente] = useState(false);
  
  // Detalle cliente state
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteDetalle, setClienteDetalle] = useState<any>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [showClienteDetalleDialog, setShowClienteDetalleDialog] = useState(false);
  
  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [emailConfig, setEmailConfig] = useState<{configured: boolean, config: any} | null>(null);
  
  const { toast } = useToast();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      
      if (data.authenticated && data.negocio) {
        setIsAuthenticated(true);
        setNegocio(data.negocio);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && negocio) {
      fetchStats();
      fetchClientes();
      fetchCompras();
      fetchConfig();
      checkEmailConfig();
    }
  }, [isAuthenticated, negocio, currentPage, searchTerm]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin');
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchClientes = async () => {
    try {
      const params = new URLSearchParams({
        negocioId: negocio!.id,
        page: currentPage.toString(),
        limit: '10',
      });
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/clientes?${params}`);
      const data = await response.json();
      if (response.ok) {
        setClientes(data.clientes);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const fetchCompras = async () => {
    try {
      const response = await fetch(`/api/compras?negocioId=${negocio!.id}`);
      const data = await response.json();
      if (response.ok) {
        setCompras(data.compras);
      }
    } catch (error) {
      console.error('Error fetching compras:', error);
    }
  };

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await fetch(`/api/configuracion?negocioId=${negocio!.id}`);
      const data = await response.json();
      if (response.ok && data.config) {
        setConfig({
          id: data.config.id,
          nombre: data.config.nombre || '',
          telefono: data.config.telefono || '',
          direccion: data.config.direccion || '',
          descripcion: data.config.descripcion || '',
          notifEmailActivo: data.config.notifEmailActivo === 1 || data.config.notifEmailActivo === true,
          notifEmailRemitente: data.config.notifEmailRemitente || '',
          notifEmailAsunto: data.config.notifEmailAsunto || 'Tu código QR de FideliQR',
          notifEmailMensaje: data.config.notifEmailMensaje || '',
          notifTelegramActivo: data.config.notifTelegramActivo === 1 || data.config.notifTelegramActivo === true,
          notifTelegramToken: data.config.notifTelegramToken || '',
          notifTelegramChatId: data.config.notifTelegramChatId || '',
          recompensaComprasNecesarias: data.config.recompensaComprasNecesarias || 10,
          recompensaDescripcion: data.config.recompensaDescripcion || 'Producto gratis',
          recompensaMensaje: data.config.recompensaMensaje || '¡Felicidades! Has alcanzado tu recompensa',
          recompensaVigenciaDias: data.config.recompensaVigenciaDias || 30,
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    setIsSavingConfig(true);
    try {
      const response = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: negocio!.id,
          ...config
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar configuración');
      }

      toast({
        title: 'Guardado',
        description: 'La configuración se actualizó correctamente',
      });
      
      // Actualizar el negocio en el estado
      setNegocio(prev => prev ? { ...prev, nombre: config.nombre } : null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleInitMigration = async () => {
    try {
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
      });
      const data = await response.json();
      toast({
        title: 'Migración completada',
        description: 'Las columnas nuevas han sido inicializadas',
      });
      fetchConfig();
    } catch (error: any) {
      console.error('Error en migración:', error);
    }
  };

  const checkEmailConfig = async () => {
    try {
      const response = await fetch('/api/test-email');
      const data = await response.json();
      setEmailConfig(data);
    } catch (error) {
      console.error('Error checking email config:', error);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Ingresa un email para la prueba',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar email');
      }

      toast({
        title: '✅ Email enviado',
        description: `Se envió un email de prueba a ${testEmail}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      setIsAuthenticated(true);
      setNegocio(data.negocio);
      
      toast({
        title: 'Bienvenido',
        description: `Sesión iniciada como ${data.negocio.nombre}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setNegocio(null);
      setStats(null);
      setClientes([]);
      setCompras([]);
      setConfig(null);
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleCanjearRecompensa = async (clienteId: string) => {
    try {
      const response = await fetch('/api/admin/canjear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al canjear');
      }

      fetchClientes();
      fetchStats();
      toast({
        title: 'Recompensa canjeada',
        description: 'Se ha registrado el canje de la recompensa',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.email) {
      toast({
        title: 'Error',
        description: 'Nombre y email son requeridos',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingCliente(true);
    try {
      const response = await fetch('/api/admin/registrar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear cliente');
      }

      setShowNuevoClienteDialog(false);
      setNuevoCliente({ nombre: '', email: '', telefono: '', comprasIniciales: 0 });
      fetchClientes();
      fetchStats();
      toast({
        title: 'Cliente registrado',
        description: `${nuevoCliente.nombre} ha sido registrado. El cliente puede ver su QR en /cliente`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingCliente(false);
    }
  };

  const handleVerDetalleCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowClienteDetalleDialog(true);
    setIsLoadingDetalle(true);
    setClienteDetalle(null);
    
    try {
      const response = await fetch(`/api/clientes/${cliente.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setClienteDetalle(data.cliente);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  // Login screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Panel de Administración</CardTitle>
            <CardDescription>
              FideliQR v2 - Ingresa tus credenciales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tu contraseña"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-violet-600 hover:bg-violet-700"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ingresando...
                  </>
                ) : 'Ingresar'}
              </Button>
            </form>
            
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link href="/#registro" className="text-violet-600 hover:underline">
                  Registra tu negocio
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">{negocio?.nombre}</h1>
              <p className="text-xs text-muted-foreground">Panel V2</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/scan?negocio=${negocio?.id}`}>
              <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Escanear QR</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="escanear" className="gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Escanear</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clientes</p>
                      <p className="text-2xl font-bold">{stats?.totalClientes || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Compras</p>
                      <p className="text-2xl font-bold">{stats?.totalCompras || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recompensas</p>
                      <p className="text-2xl font-bold">{stats?.recompensasPendientes || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Canjeadas</p>
                      <p className="text-2xl font-bold">{stats?.recompensasCanjeadas || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compras Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {compras.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay compras. Escanea el QR de un cliente para registrar.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {compras.slice(0, 10).map((compra) => (
                          <div 
                            key={compra.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                compra.esRecompensa ? 'bg-amber-100' : 'bg-violet-100'
                              }`}>
                                {compra.esRecompensa ? (
                                  <Gift className="w-4 h-4 text-amber-600" />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 text-violet-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{compra.cliente.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  Compra #{compra.compraNumero}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {new Date(compra.fecha).toLocaleDateString('es-ES')}
                              </p>
                              {compra.esRecompensa && (
                                <Badge variant="secondary" className="text-xs">Recompensa</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {clientes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay clientes. Agrega uno para comenzar.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {clientes
                          .sort((a, b) => b.comprasTotal - a.comprasTotal)
                          .slice(0, 10)
                          .map((cliente, index) => (
                            <div 
                              key={cliente.id} 
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{cliente.nombre}</p>
                                  <p className="text-xs text-muted-foreground">{cliente.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-violet-600">{cliente.comprasTotal}</p>
                                <p className="text-xs text-muted-foreground">compras</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* V2 Info */}
            <Card className="bg-violet-50 dark:bg-violet-900/20 border-violet-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-violet-700 mb-2">📋 Flujo V2 - El cliente tiene su QR</h3>
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                  <li><strong>Agrega clientes</strong> desde la pestaña "Clientes" - ellos recibirán su QR personal</li>
                  <li><strong>El cliente</strong> ve su QR en <code className="bg-muted px-1 rounded">/cliente</code></li>
                  <li><strong>Tú escaneas</strong> su QR con tu teléfono o PC para registrar compras</li>
                  <li><strong>Canjea recompensas</strong> cuando el cliente tenga {config?.recompensaComprasNecesarias || 10} compras</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clientes Tab */}
          <TabsContent value="clientes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Clientes Registrados</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-9"
                      />
                    </div>
                    <Button 
                      onClick={() => setShowNuevoClienteDialog(true)}
                      className="bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Nuevo</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-center">Compras</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">Recompensas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No hay clientes. Agrega uno para comenzar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        clientes.map((cliente) => (
                          <TableRow key={cliente.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{cliente.nombre}</p>
                                <p className="text-sm text-muted-foreground">{cliente.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-lg">{cliente.comprasTotal}</Badge>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              {cliente.recompensasPendientes > 0 ? (
                                <Badge className="bg-amber-500">{cliente.recompensasPendientes} pendiente(s)</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleVerDetalleCliente(cliente)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {cliente.recompensasPendientes > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        <span className="hidden lg:inline">Canjear</span>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>¿Canjear recompensa?</DialogTitle>
                                        <DialogDescription>
                                          Se registrará que {cliente.nombre} ha canjeado una recompensa.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="flex justify-end gap-2 mt-4">
                                        <Button variant="outline">Cancelar</Button>
                                        <Button 
                                          onClick={() => handleCanjearRecompensa(cliente.id)}
                                          className="bg-violet-600 hover:bg-violet-700"
                                        >
                                          Confirmar canje
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escanear Tab */}
          <TabsContent value="escanear" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Escanear QR del Cliente
                  </CardTitle>
                  <CardDescription>
                    Abre el escáner para leer el código QR personal del cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href={`/scan?negocio=${negocio?.id}`}>
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 gap-2" size="lg">
                      <Camera className="w-5 h-5" />
                      Abrir Escáner
                    </Button>
                  </Link>
                  <p className="text-sm text-muted-foreground text-center">
                    El cliente te muestra su QR personal y tú lo escaneas
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-violet-50 dark:bg-violet-900/20 border-violet-200">
                <CardHeader>
                  <CardTitle className="text-lg">📋 Flujo V2</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="text-sm space-y-3 list-decimal list-inside text-muted-foreground">
                    <li>El cliente busca su QR en <strong>/cliente</strong></li>
                    <li>El cliente te muestra su código QR</li>
                    <li>Tú escaneas el QR con tu teléfono</li>
                    <li>La compra se registra automáticamente</li>
                    <li>¡El cliente acumula hacia su recompensa!</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-6">
            {isLoadingConfig ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              </div>
            ) : config ? (
              <>
                {/* Información del Negocio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Información del Negocio
                    </CardTitle>
                    <CardDescription>
                      Datos básicos de tu negocio
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre del Negocio</Label>
                        <Input
                          id="nombre"
                          value={config.nombre}
                          onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                          placeholder="Nombre de tu negocio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                          id="telefono"
                          value={config.telefono || ''}
                          onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                          placeholder="+52 55 1234 5678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                          id="direccion"
                          value={config.direccion || ''}
                          onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                          placeholder="Dirección de tu negocio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Input
                          id="descripcion"
                          value={config.descripcion || ''}
                          onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
                          placeholder="Breve descripción"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuración de Notificaciones */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Configuración de Notificaciones
                    </CardTitle>
                    <CardDescription>
                      Configura cómo y cuándo recibir notificaciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email Notifications */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="notifEmailActivo">Notificaciones por Email</Label>
                        </div>
                        <Switch
                          id="notifEmailActivo"
                          checked={config.notifEmailActivo}
                          onCheckedChange={(checked) => setConfig({ ...config, notifEmailActivo: checked })}
                        />
                      </div>
                      
                      {config.notifEmailActivo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-violet-200">
                          <div className="space-y-2">
                            <Label htmlFor="notifEmailRemitente">Remitente (Email)</Label>
                            <Input
                              id="notifEmailRemitente"
                              type="email"
                              value={config.notifEmailRemitente || ''}
                              onChange={(e) => setConfig({ ...config, notifEmailRemitente: e.target.value })}
                              placeholder="noreply@tudominio.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notifEmailAsunto">Asunto del Email</Label>
                            <Input
                              id="notifEmailAsunto"
                              value={config.notifEmailAsunto || ''}
                              onChange={(e) => setConfig({ ...config, notifEmailAsunto: e.target.value })}
                              placeholder="Tu código QR de FideliQR"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="notifEmailMensaje">Mensaje Personalizado</Label>
                            <Textarea
                              id="notifEmailMensaje"
                              value={config.notifEmailMensaje || ''}
                              onChange={(e) => setConfig({ ...config, notifEmailMensaje: e.target.value })}
                              placeholder="Mensaje que se enviará junto con el QR..."
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Telegram Notifications */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="notifTelegramActivo">Notificaciones por Telegram</Label>
                        </div>
                        <Switch
                          id="notifTelegramActivo"
                          checked={config.notifTelegramActivo}
                          onCheckedChange={(checked) => setConfig({ ...config, notifTelegramActivo: checked })}
                        />
                      </div>
                      
                      {config.notifTelegramActivo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-violet-200">
                          <div className="space-y-2">
                            <Label htmlFor="notifTelegramToken">Token del Bot</Label>
                            <Input
                              id="notifTelegramToken"
                              value={config.notifTelegramToken || ''}
                              onChange={(e) => setConfig({ ...config, notifTelegramToken: e.target.value })}
                              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notifTelegramChatId">Chat ID</Label>
                            <Input
                              id="notifTelegramChatId"
                              value={config.notifTelegramChatId || ''}
                              onChange={(e) => setConfig({ ...config, notifTelegramChatId: e.target.value })}
                              placeholder="-1001234567890"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Configuración de Recompensas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Configuración de Recompensas
                    </CardTitle>
                    <CardDescription>
                      Personaliza el programa de recompensas de tu negocio
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="recompensaComprasNecesarias">Compras Necesarias para Recompensa</Label>
                        <Input
                          id="recompensaComprasNecesarias"
                          type="number"
                          min="1"
                          max="100"
                          value={config.recompensaComprasNecesarias}
                          onChange={(e) => setConfig({ ...config, recompensaComprasNecesarias: parseInt(e.target.value) || 10 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Número de compras que el cliente necesita para obtener una recompensa
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recompensaVigenciaDias">Vigencia de Recompensa (días)</Label>
                        <Input
                          id="recompensaVigenciaDias"
                          type="number"
                          min="1"
                          max="365"
                          value={config.recompensaVigenciaDias}
                          onChange={(e) => setConfig({ ...config, recompensaVigenciaDias: parseInt(e.target.value) || 30 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Días que el cliente tiene para canjear su recompensa
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recompensaDescripcion">Descripción de la Recompensa</Label>
                        <Input
                          id="recompensaDescripcion"
                          value={config.recompensaDescripcion || ''}
                          onChange={(e) => setConfig({ ...config, recompensaDescripcion: e.target.value })}
                          placeholder="Producto gratis"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ej: "Producto gratis", "Descuento 20%", "Café gratis"
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recompensaMensaje">Mensaje de Felicitación</Label>
                        <Input
                          id="recompensaMensaje"
                          value={config.recompensaMensaje || ''}
                          onChange={(e) => setConfig({ ...config, recompensaMensaje: e.target.value })}
                          placeholder="¡Felicidades! Has alcanzado tu recompensa"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botón Guardar */}
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="bg-violet-600 hover:bg-violet-700 gap-2"
                    size="lg"
                  >
                    {isSavingConfig ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground mb-4">
                    No se pudo cargar la configuración. Intenta inicializar las columnas nuevas.
                  </p>
                  <Button onClick={handleInitMigration} className="w-full bg-violet-600 hover:bg-violet-700">
                    Inicializar Configuración
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Enlaces útiles */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-amber-700 mb-2">🔗 Enlaces útiles</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Cliente ve su QR:</strong> <code className="bg-muted px-1 rounded">/cliente</code></p>
                  <p><strong>Escáner de QR:</strong> <code className="bg-muted px-1 rounded">/scan?negocio={negocio?.id}</code></p>
                  <p><strong>Email del negocio:</strong> <code className="bg-muted px-1 rounded">{negocio?.emailDestino}</code></p>
                </div>
              </CardContent>
            </Card>

            {/* Prueba de Notificaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Prueba de Notificaciones
                </CardTitle>
                <CardDescription>
                  Verifica que las notificaciones por email funcionen correctamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Estado de configuración */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  {emailConfig?.configured ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Email configurado</p>
                        <p className="text-xs text-muted-foreground">{emailConfig.config.user}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="font-medium text-sm">Email no configurado</p>
                        <p className="text-xs text-muted-foreground">Agrega SMTP_USER y SMTP_PASS en Vercel</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Formulario de prueba */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest || !emailConfig?.configured}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Probar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa un email para enviar un mensaje de prueba y verificar la configuración.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Nuevo Cliente Dialog */}
      <Dialog open={showNuevoClienteDialog} onOpenChange={setShowNuevoClienteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
            <DialogDescription>
              El cliente recibirá su QR personal por email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <Input
                id="telefono"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevoClienteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearCliente} 
              disabled={isCreatingCliente}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isCreatingCliente ? 'Registrando...' : 'Registrar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cliente Detalle Dialog */}
      <Dialog open={showClienteDetalleDialog} onOpenChange={setShowClienteDetalleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
          </DialogHeader>
          {isLoadingDetalle ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            </div>
          ) : clienteDetalle ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Nombre</Label>
                  <p className="font-medium">{clienteDetalle.nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p className="font-medium">{clienteDetalle.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Compras Totales</Label>
                  <p className="font-medium text-2xl text-violet-600">{clienteDetalle.comprasTotal}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Recompensas</Label>
                  <p className="font-medium">{clienteDetalle.recompensasPendientes} pendientes, {clienteDetalle.recompensasCanjeadas} canjeadas</p>
                </div>
              </div>
              {clienteDetalle.qrCodigo && (
                <div className="bg-muted p-3 rounded-lg">
                  <Label className="text-muted-foreground text-sm">Código QR</Label>
                  <p className="font-mono text-xs break-all">{clienteDetalle.qrCodigo}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                El cliente puede ver su QR en <code className="bg-muted px-1 rounded">/cliente</code> con su email
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-4 bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          FideliQR v2 - El cliente tiene su QR personal
        </div>
      </footer>
    </div>
  );
}
