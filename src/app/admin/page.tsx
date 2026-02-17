'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { Progress } from '@/components/ui/progress';
import {
  QrCode,
  Store,
  Users,
  ShoppingBag,
  Gift,
  Settings,
  Download,
  LogOut,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  ExternalLink,
  Copy,
  MessageCircle,
  Mail,
  TrendingUp,
  Award,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Eye,
  Calendar,
  Clock,
  Activity,
  TrendingDown,
  Shield,
  Ban,
  ShieldAlert,
  AlertTriangle
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
  descripcion?: string;
  telegramToken?: string;
  telegramChatId?: string;
  telegramActivo: boolean;
  qrUrl: string;
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
  _count?: { compras: number };
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

interface AlertaSeguridad {
  id: string;
  tipo: string;
  descripcion: string;
  revisada: boolean;
  creadaEn: string;
  cliente?: {
    id: string;
    nombre: string;
    email: string;
  };
}

interface ActividadSospechosa {
  id: string;
  nombre: string;
  email: string;
  cantidad_compras: number;
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
  const [configData, setConfigData] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    descripcion: '',
    telegramToken: '',
    telegramChatId: '',
    telegramActivo: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  // Auto-fix QR state
  const [isAutoFixingQR, setIsAutoFixingQR] = useState(false);
  
  // Seguridad state
  const [seguridadData, setSeguridadData] = useState<{
    alertas: AlertaSeguridad[];
    clientesBloqueados: any[];
    actividadSospechosa: ActividadSospechosa[];
    estadisticas: { totalAlertas: number; totalBloqueados: number; totalSospechosos: number };
  } | null>(null);
  const [isLoadingSeguridad, setIsLoadingSeguridad] = useState(false);
  const [showBloquearDialog, setShowBloquearDialog] = useState(false);
  const [clienteABloquear, setClienteABloquear] = useState<Cliente | null>(null);
  const [motivoBloqueo, setMotivoBloqueo] = useState('');
  const [isBloqueando, setIsBloqueando] = useState(false);
  
  const { toast } = useToast();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      
      if (data.authenticated && data.negocio) {
        setIsAuthenticated(true);
        setNegocio(data.negocio);
        setConfigData({
          nombre: data.negocio.nombre,
          telefono: data.negocio.telefono || '',
          direccion: data.negocio.direccion || '',
          descripcion: data.negocio.descripcion || '',
          telegramToken: data.negocio.telegramToken || '',
          telegramChatId: data.negocio.telegramChatId || '',
          telegramActivo: data.negocio.telegramActivo || false,
        });
        
        // Auto-corregir el QR si tiene una URL incorrecta
        autoFixQRIfNeeded(data.negocio);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para auto-corregir el QR si es necesario
  const autoFixQRIfNeeded = async (negocioData: Negocio) => {
    // Verificar si la URL del QR es válida (debe ser accesible desde internet)
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = negocioData.qrUrl || '';
    
    // Si el QR no existe o no empieza con la URL actual del navegador, corregirlo
    const needsFix = !qrUrl || 
                     !qrUrl.startsWith('http') || 
                     !qrUrl.startsWith(currentOrigin);
    
    if (needsFix && currentOrigin) {
      console.log('Auto-fixing QR URL. Current origin:', currentOrigin, 'QR URL:', qrUrl);
      try {
        const response = await fetch('/api/admin/auto-fix-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: currentOrigin }),
        });

        const data = await response.json();
        if (response.ok && data.negocio) {
          setNegocio(prev => prev ? { ...prev, qrUrl: data.negocio.qrUrl } : null);
          console.log('QR auto-fixed successfully:', data.negocio.qrUrl);
        }
      } catch (error) {
        console.error('Error auto-fixing QR:', error);
      }
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && negocio) {
      fetchStats();
      fetchClientes();
      fetchCompras();
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
        setTotalPages(data.pagination.totalPages);
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
      setConfigData({
        nombre: data.negocio.nombre,
        telefono: data.negocio.telefono || '',
        direccion: data.negocio.direccion || '',
        descripcion: data.negocio.descripcion || '',
        telegramToken: data.negocio.telegramToken || '',
        telegramChatId: data.negocio.telegramChatId || '',
        telegramActivo: data.negocio.telegramActivo || false,
      });
      
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
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      setNegocio(data.negocio);
      toast({
        title: 'Guardado',
        description: 'Configuración actualizada correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(`/api/qr?negocioId=${negocio!.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${negocio!.nombre.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el QR',
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
        description: `${nuevoCliente.nombre} ha sido registrado correctamente`,
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
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo cargar el detalle del cliente',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar detalle',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  const handleAutoFixQR = async () => {
    setIsAutoFixingQR(true);
    try {
      // Obtener la URL base desde el navegador (esta es la URL pública correcta)
      const baseUrl = window.location.origin;
      
      const response = await fetch('/api/admin/auto-fix-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al corregir QR');
      }

      setNegocio(prev => prev ? { ...prev, qrUrl: data.negocio.qrUrl } : null);
      toast({
        title: '✅ QR Corregido',
        description: `El código QR ha sido actualizado con la URL: ${data.usedBaseUrl}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsAutoFixingQR(false);
    }
  };

  // Cargar datos de seguridad
  const fetchSeguridad = async () => {
    setIsLoadingSeguridad(true);
    try {
      const response = await fetch('/api/admin/seguridad');
      const data = await response.json();
      if (response.ok) {
        setSeguridadData(data);
      }
    } catch (error) {
      console.error('Error cargando seguridad:', error);
    } finally {
      setIsLoadingSeguridad(false);
    }
  };

  // Bloquear cliente
  const handleBloquearCliente = async () => {
    if (!clienteABloquear || !motivoBloqueo.trim()) {
      toast({
        title: 'Error',
        description: 'Debes ingresar un motivo para bloquear',
        variant: 'destructive',
      });
      return;
    }

    setIsBloqueando(true);
    try {
      const response = await fetch('/api/admin/seguridad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'bloquear',
          clienteId: clienteABloquear.id,
          motivo: motivoBloqueo,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Cliente bloqueado',
          description: `${clienteABloquear.nombre} ha sido bloqueado`,
        });
        setShowBloquearDialog(false);
        setClienteABloquear(null);
        setMotivoBloqueo('');
        fetchSeguridad();
        fetchClientes();
      } else {
        throw new Error('Error al bloquear');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo bloquear al cliente',
        variant: 'destructive',
      });
    } finally {
      setIsBloqueando(false);
    }
  };

  // Desbloquear cliente
  const handleDesbloquearCliente = async (clienteId: string, nombre: string) => {
    try {
      const response = await fetch('/api/admin/seguridad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'desbloquear',
          clienteId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Cliente desbloqueado',
          description: `${nombre} ha sido desbloqueado`,
        });
        fetchSeguridad();
        fetchClientes();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo desbloquear al cliente',
        variant: 'destructive',
      });
    }
  };

  // Marcar alerta como revisada
  const handleRevisarAlerta = async (alertaId: string) => {
    try {
      await fetch('/api/admin/seguridad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'revisar_alerta',
          alertaId,
        }),
      });
      fetchSeguridad();
    } catch (error) {
      console.error('Error revisando alerta:', error);
    }
  };

  // Cargar seguridad cuando se cambia a esa pestaña
  useEffect(() => {
    if (activeTab === 'seguridad' && negocio) {
      fetchSeguridad();
    }
  }, [activeTab, negocio]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'URL copiada al portapapeles',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Panel de Administración</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder
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
                className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                <Link href="/#registro" className="text-emerald-600 hover:underline">
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">{negocio?.nombre}</h1>
              <p className="text-xs text-muted-foreground">Panel de Administración</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Mi QR</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-600" />
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
                      <p className="text-xs text-muted-foreground">pendientes</p>
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
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Compras Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {compras.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay compras registradas
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
                                compra.esRecompensa 
                                  ? 'bg-amber-100' 
                                  : 'bg-emerald-100'
                              }`}>
                                {compra.esRecompensa ? (
                                  <Gift className="w-4 h-4 text-amber-600" />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
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
                                <Badge variant="secondary" className="text-xs">
                                  Recompensa
                                </Badge>
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
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {clientes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay clientes registrados
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{cliente.nombre}</p>
                                  <p className="text-xs text-muted-foreground">{cliente.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-emerald-600">{cliente.comprasTotal}</p>
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
          </TabsContent>

          {/* Clientes Tab */}
          <TabsContent value="clientes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Lista de Clientes</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar clientes..."
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
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
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
                        <TableHead className="hidden md:table-cell">Última compra</TableHead>
                        <TableHead className="text-center">Compras</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">Recompensas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No se encontraron clientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        clientes.map((cliente) => (
                          <TableRow key={cliente.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleVerDetalleCliente(cliente)}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{cliente.nombre}</p>
                                <p className="text-sm text-muted-foreground">{cliente.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {cliente.ultimaCompra ? (
                                <div className="text-sm">
                                  <p>{new Date(cliente.ultimaCompra).toLocaleDateString('es-ES')}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {new Date(cliente.ultimaCompra).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Sin compras</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-lg">{cliente.comprasTotal}</Badge>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              <div className="flex flex-col items-center gap-1">
                                {cliente.recompensasPendientes > 0 && (
                                  <Badge className="bg-amber-500">
                                    {cliente.recompensasPendientes} pendiente(s)
                                  </Badge>
                                )}
                                {cliente.recompensasCanjeadas > 0 && (
                                  <Badge variant="secondary">
                                    {cliente.recompensasCanjeadas} canjeada(s)
                                  </Badge>
                                )}
                                {cliente.recompensasPendientes === 0 && cliente.recompensasCanjeadas === 0 && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                                          Esta acción no se puede deshacer.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="flex justify-end gap-2 mt-4">
                                        <Button variant="outline">Cancelar</Button>
                                        <Button 
                                          onClick={() => handleCanjearRecompensa(cliente.id)}
                                          className="bg-emerald-600 hover:bg-emerald-700"
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

                {/* Pagination */}
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

          {/* QR Tab */}
          <TabsContent value="qr" className="space-y-6">
            {/* Alerta si el QR no tiene URL válida */}
            {negocio?.qrUrl && !negocio.qrUrl.startsWith('http') && (
              <Card className="border-amber-500 bg-amber-50">
                <CardContent className="pt-6 flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">URL del QR no válida</p>
                    <p className="text-sm text-amber-700">
                      La URL actual del QR no es accesible desde internet. 
                      Haz clic en "Regenerar QR" para corregirla.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Tu Código QR
                  </CardTitle>
                  <CardDescription>
                    Imprime este código y colócalo en tu caja para que los clientes puedan escanearlo
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {negocio?.qrUrl && negocio.qrUrl.startsWith('http') ? (
                    <>
                      <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(negocio.qrUrl)}`}
                          alt="QR Code"
                          className="w-64 h-64"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleDownloadQR} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                          <Download className="w-4 h-4" />
                          Descargar QR
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={handleAutoFixQR}
                          disabled={isAutoFixingQR}
                        >
                          {isAutoFixingQR ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Actualizando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Actualizar URL
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        El QR necesita ser actualizado con una URL válida
                      </p>
                      <Button 
                        onClick={handleAutoFixQR}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={isAutoFixingQR}
                      >
                        {isAutoFixingQR ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Corrigiendo...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Corregir QR automáticamente
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Enlaces de tu negocio
                  </CardTitle>
                  <CardDescription>
                    Comparte estos enlaces con tus clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Enlace para acumular compras</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={negocio?.qrUrl || ''} 
                        readOnly 
                        className="bg-muted text-xs"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(negocio?.qrUrl || '')}
                        disabled={!negocio?.qrUrl}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Los clientes usan este enlace (o escanean el QR) para acumular sus compras
                    </p>
                  </div>

                  <Separator />

                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">💡 Cómo funciona</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Registra a tus clientes desde la pestaña "Clientes"</li>
                      <li>Imprime el QR y colócalo en tu caja</li>
                      <li>El cliente escanea el QR e ingresa su email</li>
                      <li>El sistema suma la compra automáticamente</li>
                    </ol>
                  </div>

                  <Separator />

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-emerald-700 dark:text-emerald-400">✅ Sistema simplificado</h4>
                    <p className="text-sm text-muted-foreground">
                      Los clientes se registran <strong>únicamente</strong> desde este panel de administración. 
                      El QR sirve solo para acumular compras de clientes ya registrados.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Seguridad Tab */}
          <TabsContent value="seguridad" className="space-y-6">
            {isLoadingSeguridad ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                {/* Stats de seguridad */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                      <p className="text-2xl font-bold">{seguridadData?.estadisticas.totalAlertas || 0}</p>
                      <p className="text-sm text-muted-foreground">Alertas pendientes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Ban className="w-8 h-8 mx-auto text-red-500 mb-2" />
                      <p className="text-2xl font-bold">{seguridadData?.estadisticas.totalBloqueados || 0}</p>
                      <p className="text-sm text-muted-foreground">Clientes bloqueados</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Activity className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                      <p className="text-2xl font-bold">{seguridadData?.estadisticas.totalSospechosos || 0}</p>
                      <p className="text-sm text-muted-foreground">Actividad sospechosa</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Clientes bloqueados */}
                {(seguridadData?.clientesBloqueados?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <Ban className="w-5 h-5" />
                        Clientes Bloqueados
                      </CardTitle>
                      <CardDescription>
                        Clientes que han sido bloqueados por sospecha de fraude
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Motivo</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {seguridadData?.clientesBloqueados.map((cliente: any) => (
                              <TableRow key={cliente.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{cliente.nombre}</p>
                                    <p className="text-sm text-muted-foreground">{cliente.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{cliente.motivoBloqueo || '-'}</TableCell>
                                <TableCell>
                                  {cliente.bloqueadoEn 
                                    ? new Date(cliente.bloqueadoEn).toLocaleDateString('es-ES')
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDesbloquearCliente(cliente.id, cliente.nombre)}
                                  >
                                    Desbloquear
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Actividad sospechosa */}
                {(seguridadData?.actividadSospechosa?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="w-5 h-5" />
                        Actividad Sospechosa (Últimas 24h)
                      </CardTitle>
                      <CardDescription>
                        Clientes con más de 5 compras en las últimas 24 horas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead className="text-center">Compras (24h)</TableHead>
                              <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {seguridadData?.actividadSospechosa.map((cliente: any) => (
                              <TableRow key={cliente.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{cliente.nombre}</p>
                                    <p className="text-sm text-muted-foreground">{cliente.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="destructive">{cliente.cantidad_compras}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setClienteABloquear(cliente);
                                      setShowBloquearDialog(true);
                                    }}
                                  >
                                    <Ban className="w-4 h-4 mr-1" />
                                    Bloquear
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Alertas */}
                {(seguridadData?.alertas?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" />
                        Historial de Alertas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64 rounded-md border">
                        <div className="divide-y">
                          {seguridadData?.alertas.map((alerta) => (
                            <div 
                              key={alerta.id} 
                              className={`p-4 flex items-center justify-between ${alerta.revisada ? 'bg-muted/30' : 'bg-amber-50'}`}
                            >
                              <div className="flex items-start gap-3">
                                <AlertCircle className={`w-5 h-5 mt-0.5 ${alerta.revisada ? 'text-muted-foreground' : 'text-amber-500'}`} />
                                <div>
                                  <p className="font-medium text-sm">{alerta.descripcion}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{new Date(alerta.creadaEn).toLocaleString('es-ES')}</span>
                                    {alerta.cliente && (
                                      <span>• {alerta.cliente.nombre}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!alerta.revisada && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRevisarAlerta(alerta.id)}
                                >
                                  Marcar revisada
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Info de seguridad */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Sistema de Seguridad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <h4 className="font-medium text-emerald-800 mb-2">🛡️ Protección activa</h4>
                      <ul className="text-sm text-emerald-700 space-y-1 list-disc list-inside">
                        <li>Cooldown de <strong>60 minutos</strong> entre compras del mismo cliente</li>
                        <li>Bloqueo automático de clientes sospechosos</li>
                        <li>Detección de compras excesivas en 24 horas</li>
                        <li>Historial de alertas de seguridad</li>
                      </ul>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-medium mb-2">💡 Recomendaciones</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Revisa periódicamente la actividad sospechosa</li>
                        <li>Bloquea clientes que hagan trampa</li>
                        <li>El QR solo debe mostrarse después de una compra real</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración del Negocio
                </CardTitle>
                <CardDescription>
                  Actualiza la información de tu negocio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="config-nombre">Nombre del negocio</Label>
                    <Input
                      id="config-nombre"
                      value={configData.nombre}
                      onChange={(e) => setConfigData({ ...configData, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="config-telefono">Teléfono</Label>
                    <Input
                      id="config-telefono"
                      value={configData.telefono}
                      onChange={(e) => setConfigData({ ...configData, telefono: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config-direccion">Dirección</Label>
                  <Input
                    id="config-direccion"
                    value={configData.direccion}
                    onChange={(e) => setConfigData({ ...configData, direccion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config-descripcion">Descripción</Label>
                  <Input
                    id="config-descripcion"
                    value={configData.descripcion}
                    onChange={(e) => setConfigData({ ...configData, descripcion: e.target.value })}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium">Notificaciones por Telegram</h3>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activar Telegram</Label>
                      <p className="text-sm text-muted-foreground">
                        Recibe notificaciones cuando un cliente se registre o alcance una recompensa
                      </p>
                    </div>
                    <Switch
                      checked={configData.telegramActivo}
                      onCheckedChange={(checked) => 
                        setConfigData({ ...configData, telegramActivo: checked })
                      }
                    />
                  </div>

                  {configData.telegramActivo && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="telegram-token">Token del Bot</Label>
                        <Input
                          id="telegram-token"
                          type="password"
                          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                          value={configData.telegramToken}
                          onChange={(e) => 
                            setConfigData({ ...configData, telegramToken: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telegram-chat">Chat ID</Label>
                        <Input
                          id="telegram-chat"
                          placeholder="-1001234567890"
                          value={configData.telegramChatId}
                          onChange={(e) => 
                            setConfigData({ ...configData, telegramChatId: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">📱 ¿Cómo configurar Telegram?</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Crea un bot con <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">@BotFather</a> y obtén el token</li>
                      <li>Inicia un chat con tu bot</li>
                      <li>Obtén tu Chat ID con <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">@userinfobot</a></li>
                      <li>Ingresa ambos datos arriba</li>
                    </ol>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-medium">Notificaciones por Email</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Las notificaciones por email se envían automáticamente a:{' '}
                  <span className="font-medium">{negocio?.emailDestino}</span>
                </p>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveConfig} 
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : 'Guardar cambios'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <QrCode className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium">FideliQR</span>
          </div>
        </div>
      </footer>

      {/* Dialog: Nuevo Cliente */}
      <Dialog open={showNuevoClienteDialog} onOpenChange={setShowNuevoClienteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Completa los datos para registrar un cliente manualmente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nuevo-nombre">Nombre completo *</Label>
              <Input
                id="nuevo-nombre"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-email">Email *</Label>
              <Input
                id="nuevo-email"
                type="email"
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-telefono">Teléfono</Label>
              <Input
                id="nuevo-telefono"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                placeholder="+52 55 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-compras">Compras iniciales</Label>
              <Input
                id="nuevo-compras"
                type="number"
                min="0"
                value={nuevoCliente.comprasIniciales}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, comprasIniciales: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Si ingresas 10 o más, se calcularán las recompensas automáticamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevoClienteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearCliente}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isCreatingCliente}
            >
              {isCreatingCliente ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : 'Registrar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalle Cliente */}
      <Dialog open={showClienteDetalleDialog} onOpenChange={setShowClienteDetalleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedCliente?.nombre}
            </DialogTitle>
            <DialogDescription>
              {selectedCliente?.email}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetalle ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : clienteDetalle ? (
            <div className="space-y-4 overflow-y-auto flex-1">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <ShoppingBag className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                    <p className="text-2xl font-bold">{clienteDetalle.comprasTotal}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Activity className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold">{clienteDetalle.estadisticas?.comprasUltimos7Dias || 0}</p>
                    <p className="text-xs text-muted-foreground">Esta semana</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold">{clienteDetalle.estadisticas?.comprasUltimos30Dias || 0}</p>
                    <p className="text-xs text-muted-foreground">Este mes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Award className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                    <p className="text-2xl font-bold">{clienteDetalle.recompensasCanjeadas}</p>
                    <p className="text-xs text-muted-foreground">Canjeadas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progreso hacia recompensa */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Progreso hacia próxima recompensa</span>
                    <span className="text-emerald-600 font-bold">
                      {clienteDetalle.comprasTotal % 10} / 10
                    </span>
                  </div>
                  <Progress value={(clienteDetalle.comprasTotal % 10) * 10} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Faltan <strong>{10 - (clienteDetalle.comprasTotal % 10)}</strong> compras para la próxima recompensa
                  </p>
                </CardContent>
              </Card>

              {/* Info adicional */}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Cliente desde: {new Date(clienteDetalle.createdAt).toLocaleDateString('es-ES')}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Promedio: {clienteDetalle.estadisticas?.comprasPorMes || 0} compras/mes
                </div>
                {clienteDetalle.telefono && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    📞 {clienteDetalle.telefono}
                  </div>
                )}
              </div>

              {/* Historial de compras */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Historial de compras
                </h4>
                <ScrollArea className="h-48 rounded border">
                  {clienteDetalle.compras?.length > 0 ? (
                    <div className="divide-y">
                      {clienteDetalle.compras.map((compra: any) => (
                        <div key={compra.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              compra.esRecompensa ? 'bg-amber-100' : 'bg-emerald-100'
                            }`}>
                              {compra.esRecompensa ? (
                                <Gift className="w-4 h-4 text-amber-600" />
                              ) : (
                                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">Compra #{compra.compraNumero}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(compra.fecha).toLocaleDateString('es-ES')} a las {' '}
                                {new Date(compra.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          {compra.esRecompensa && (
                            <Badge className="bg-amber-500">Recompensa</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay compras registradas
                    </p>
                  )}
                </ScrollArea>
              </div>

              {/* Recompensas pendientes */}
              {clienteDetalle.recompensasPendientes > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-amber-800">
                        {clienteDetalle.recompensasPendientes} recompensa(s) pendiente(s)
                      </span>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        handleCanjearRecompensa(clienteDetalle.id);
                        setShowClienteDetalleDialog(false);
                      }}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Canjear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No se pudo cargar la información
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Bloquear Cliente */}
      <Dialog open={showBloquearDialog} onOpenChange={setShowBloquearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="w-5 h-5" />
              Bloquear Cliente
            </DialogTitle>
            <DialogDescription>
              Vas a bloquear a <strong>{clienteABloquear?.nombre}</strong> ({clienteABloquear?.email}).
              El cliente no podrá registrar más compras hasta que lo desbloquees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del bloqueo *</Label>
              <Input
                id="motivo"
                placeholder="Ej: Sospecha de fraude, compras excesivas..."
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value)}
              />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                ⚠️ Esta acción bloqueará al cliente inmediatamente. 
                Podrás desbloquearlo desde la pestaña de Seguridad.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBloquearDialog(false);
              setClienteABloquear(null);
              setMotivoBloqueo('');
            }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBloquearCliente}
              disabled={isBloqueando || !motivoBloqueo.trim()}
            >
              {isBloqueando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bloqueando...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Bloquear cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
