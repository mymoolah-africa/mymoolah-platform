import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Activity, 
  Clock, 
  RefreshCw, 
  LogOut, 
  Bell, 
  User, 
  Store,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  Settings,
  Eye,
  MoreVertical
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

// Type definitions
interface DashboardMetrics {
  totalPortalUsers: number;
  dualRoleEntities: number;
  recentActivity24h: number;
  systemUptime: string;
}

interface EntityDistribution {
  suppliers: number;
  clients: number;
  merchants: number;
  resellers: number;
}

interface SettlementSummary {
  pendingSettlements: number;
  totalAmount: number;
  autoSettlementEnabled: boolean;
  nextSettlement: string;
}

interface DualRoleEntity {
  id: string;
  name: string;
  entityId: string;
  roles: string[];
  supplierBalance: number;
  merchantBalance: number;
  netBalance: number;
  status: 'active' | 'suspended';
  settlementDue: boolean;
}

interface RecentAlert {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [entityDistribution, setEntityDistribution] = useState<EntityDistribution | null>(null);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const [dualRoleEntities, setDualRoleEntities] = useState<DualRoleEntity[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemHealthy, setSystemHealthy] = useState(true);

  // Load admin user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('portal_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setAdminUser(user);
      } catch (error) {
        console.error('Failed to parse admin user data:', error);
        navigate('/admin/login');
      }
    } else {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Load dashboard data
  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_BASE_URL;
      
      if (isDemoMode) {
        // Demo mode - simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data for demo
        setMetrics({
          totalPortalUsers: 1247,
          dualRoleEntities: 89,
          recentActivity24h: 342,
          systemUptime: '99.97%'
        });

        setEntityDistribution({
          suppliers: 156,
          clients: 1091,
          merchants: 234,
          resellers: 67
        });

        setSettlementSummary({
          pendingSettlements: 23,
          totalAmount: 487650.00,
          autoSettlementEnabled: true,
          nextSettlement: '2025-01-10T09:00:00Z'
        });

        setDualRoleEntities([
          {
            id: '1',
            name: 'ABC Trading Ltd',
            entityId: 'ENT-001',
            roles: ['supplier', 'merchant'],
            supplierBalance: 45230.50,
            merchantBalance: -12450.00,
            netBalance: 32780.50,
            status: 'active',
            settlementDue: false
          },
          {
            id: '2',
            name: 'XYZ Commerce',
            entityId: 'ENT-002',
            roles: ['merchant', 'reseller'],
            supplierBalance: 0,
            merchantBalance: 23100.75,
            netBalance: 23100.75,
            status: 'active',
            settlementDue: true
          },
          {
            id: '3',
            name: 'SuperStore Chain',
            entityId: 'ENT-003',
            roles: ['supplier', 'merchant'],
            supplierBalance: 78900.00,
            merchantBalance: -89100.25,
            netBalance: -10200.25,
            status: 'active',
            settlementDue: false
          }
        ]);

        setRecentAlerts([
          {
            id: '1',
            type: 'warning',
            title: 'Settlement Overdue',
            message: 'XYZ Commerce has an overdue settlement requiring attention',
            timestamp: '2025-01-09T14:30:00Z'
          },
          {
            id: '2',
            type: 'success',
            title: 'System Update Complete',
            message: 'Platform maintenance completed successfully with zero downtime',
            timestamp: '2025-01-09T12:15:00Z'
          },
          {
            id: '3',
            type: 'info',
            title: 'New Entity Registration',
            message: 'Tech Solutions Ltd completed KYC verification and is now active',
            timestamp: '2025-01-09T10:45:00Z'
          },
          {
            id: '4',
            type: 'error',
            title: 'API Rate Limit Exceeded',
            message: 'Entity ENT-045 exceeded API rate limits, temporary throttling applied',
            timestamp: '2025-01-09T09:20:00Z'
          }
        ]);

        setSystemHealthy(true);
      } else {
        // Production mode - real API calls
        const token = localStorage.getItem('portal_token');
        if (!token) {
          navigate('/admin/login');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Parallel API calls for better performance
        const [metricsRes, entityRes, settlementRes, entitiesRes, alertsRes] = await Promise.all([
          fetch('/api/v1/admin/dashboard/metrics', { headers }),
          fetch('/api/v1/admin/dashboard/entity-distribution', { headers }),
          fetch('/api/v1/admin/dashboard/settlement-summary', { headers }),
          fetch('/api/v1/admin/dashboard/dual-role-entities', { headers }),
          fetch('/api/v1/admin/dashboard/recent-alerts', { headers })
        ]);

        // Check for authentication errors
        if (metricsRes.status === 401) {
          localStorage.removeItem('portal_token');
          localStorage.removeItem('portal_user');
          navigate('/admin/login');
          return;
        }

        // Parse responses
        const [metricsData, entityData, settlementData, entitiesData, alertsData] = await Promise.all([
          metricsRes.json(),
          entityRes.json(),
          settlementRes.json(),
          entitiesRes.json(),
          alertsRes.json()
        ]);

        setMetrics(metricsData);
        setEntityDistribution(entityData);
        setSettlementSummary(settlementData);
        setDualRoleEntities(entitiesData);
        setRecentAlerts(alertsData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSystemHealthy(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (adminUser) {
      loadDashboardData();
    }
  }, [adminUser]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    navigate('/admin/login');
  };

  // Handle refresh
  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-r from-mymoolah-green/20 to-mymoolah-blue/20 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-6 h-6 animate-spin text-mymoolah-green" />
          </div>
          <p className="text-lg text-gray-600 wallet-form-label">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-mymoolah-green to-mymoolah-blue rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 wallet-form-label">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 wallet-form-label">
                System overview and management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* System Health Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 font-medium wallet-form-label">
                System Healthy
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="wallet-btn-primary"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-mymoolah-green to-mymoolah-blue rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="wallet-form-label">
                    {adminUser?.name || 'Admin User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="wallet-form-label">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="wallet-form-label">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Portal Users */}
          <Card className="wallet-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1 wallet-form-label">
                    Total Portal Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900 wallet-form-label">
                    {metrics?.totalPortalUsers.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-mymoolah-green/20 to-mymoolah-blue/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-mymoolah-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dual-Role Entities */}
          <Card className="wallet-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1 wallet-form-label">
                    Dual-Role Entities
                  </p>
                  <p className="text-2xl font-bold text-gray-900 wallet-form-label">
                    {metrics?.dualRoleEntities.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-mymoolah-green/20 to-mymoolah-blue/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-mymoolah-green" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="wallet-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1 wallet-form-label">
                    Recent Activity (24h)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 wallet-form-label">
                    {metrics?.recentActivity24h.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-mymoolah-green/20 to-mymoolah-blue/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-mymoolah-green" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Uptime */}
          <Card className="wallet-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1 wallet-form-label">
                    System Uptime
                  </p>
                  <p className="text-2xl font-bold text-gray-900 wallet-form-label">
                    {metrics?.systemUptime || '0%'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-mymoolah-green/20 to-mymoolah-blue/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-mymoolah-blue" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Entity Distribution */}
          <Card className="wallet-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold wallet-form-label">
                Entity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-mymoolah-green" />
                  <span className="text-sm text-gray-700 wallet-form-label">
                    Suppliers
                  </span>
                </div>
                <span className="text-base font-semibold text-gray-900 wallet-form-label">
                  {entityDistribution?.suppliers.toLocaleString() || '0'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-mymoolah-blue" />
                  <span className="text-sm text-gray-700 wallet-form-label">
                    Clients
                  </span>
                </div>
                <span className="text-base font-semibold text-gray-900 wallet-form-label">
                  {entityDistribution?.clients.toLocaleString() || '0'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-mymoolah-green" />
                  <span className="text-sm text-gray-700 wallet-form-label">
                    Merchants
                  </span>
                </div>
                <span className="text-base font-semibold text-gray-900 wallet-form-label">
                  {entityDistribution?.merchants.toLocaleString() || '0'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-mymoolah-blue" />
                  <span className="text-sm text-gray-700 wallet-form-label">
                    Resellers
                  </span>
                </div>
                <span className="text-base font-semibold text-gray-900 wallet-form-label">
                  {entityDistribution?.resellers.toLocaleString() || '0'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Settlement Summary */}
          <Card className="wallet-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold wallet-form-label">
                Settlement Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 wallet-form-label">
                  Pending Settlements
                </span>
                <span className="text-base font-semibold text-gray-900 wallet-form-label">
                  {settlementSummary?.pendingSettlements || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 wallet-form-label">
                  Total Amount
                </span>
                <span className="text-base font-semibold text-gray-900 wallet-form-label">
                  {formatCurrency(settlementSummary?.totalAmount || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 wallet-form-label">
                  Auto Settlement
                </span>
                <Badge variant={settlementSummary?.autoSettlementEnabled ? 'default' : 'secondary'} className="wallet-badge">
                  {settlementSummary?.autoSettlementEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 wallet-form-label">
                  Next Settlement
                </span>
                <span className="text-sm text-gray-700 wallet-form-label">
                  {settlementSummary?.nextSettlement ? formatTimestamp(settlementSummary.nextSettlement) : 'Not scheduled'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dual-Role Entities Table */}
        <Card className="mb-8 wallet-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold wallet-form-label">
              Dual-Role Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="wallet-form-label">Entity</TableHead>
                    <TableHead className="wallet-form-label">Roles</TableHead>
                    <TableHead className="wallet-form-label">Supplier Balance</TableHead>
                    <TableHead className="wallet-form-label">Merchant Balance</TableHead>
                    <TableHead className="wallet-form-label">Net Balance</TableHead>
                    <TableHead className="wallet-form-label">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dualRoleEntities.map((entity) => (
                    <TableRow key={entity.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900 wallet-form-label">
                            {entity.name}
                          </p>
                          <p className="text-xs text-gray-600 wallet-form-label">
                            {entity.entityId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {entity.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs wallet-badge">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-mymoolah-green wallet-form-label">
                          {formatCurrency(entity.supplierBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-mymoolah-blue wallet-form-label">
                          {formatCurrency(entity.merchantBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium wallet-form-label ${
                          entity.netBalance >= 0 ? 'text-mymoolah-green' : 'text-red-600'
                        }`}>
                          {formatCurrency(entity.netBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={entity.status === 'active' ? 'default' : 'secondary'} className="wallet-badge">
                            {entity.status}
                          </Badge>
                          {entity.settlementDue && (
                            <Badge variant="outline" className="wallet-badge bg-orange-50 text-orange-700 border-orange-200">
                              Settlement Due
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              <span className="wallet-form-label">View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <DollarSign className="w-4 h-4 mr-2" />
                              <span className="wallet-form-label">Process Settlement</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="wallet-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold wallet-form-label">
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert, index) => (
                <div key={alert.id}>
                  <div className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'warning' ? 'border-orange-500 bg-orange-50' :
                    alert.type === 'error' ? 'border-red-500 bg-red-50' :
                    alert.type === 'success' ? 'border-green-500 bg-green-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1 wallet-form-label">
                          {alert.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2 wallet-form-label">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 wallet-form-label">
                          {formatTimestamp(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < recentAlerts.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default AdminDashboardPage;