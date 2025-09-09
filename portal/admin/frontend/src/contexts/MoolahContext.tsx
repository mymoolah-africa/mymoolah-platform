import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Moolah Context Types
interface SystemMetrics {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  systemUptime: number;
  activeSessions: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  services: {
    database: 'up' | 'down';
    api: 'up' | 'down';
    payments: 'up' | 'down';
    notifications: 'up' | 'down';
  };
}

interface MoolahContextType {
  systemMetrics: SystemMetrics | null;
  systemHealth: SystemHealth | null;
  isLoading: boolean;
  refreshMetrics: () => Promise<void>;
  refreshHealth: () => Promise<void>;
}

// Create Moolah Context
const MoolahContext = createContext<MoolahContextType | undefined>(undefined);

// Moolah Provider Props
interface MoolahProviderProps {
  children: ReactNode;
}

// Moolah Provider Component
export const MoolahProvider: React.FC<MoolahProviderProps> = ({ children }) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        refreshMetrics(),
        refreshHealth()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh system metrics
  const refreshMetrics = async (): Promise<void> => {
    try {
      // Demo data for now - replace with actual API call
      const mockMetrics: SystemMetrics = {
        totalUsers: 15420,
        totalTransactions: 89456,
        totalRevenue: 2456789.50,
        systemUptime: 99.95,
        activeSessions: 1247
      };

      setSystemMetrics(mockMetrics);
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    }
  };

  // Refresh system health
  const refreshHealth = async (): Promise<void> => {
    try {
      // Demo data for now - replace with actual API call
      const mockHealth: SystemHealth = {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        services: {
          database: 'up',
          api: 'up',
          payments: 'up',
          notifications: 'up'
        }
      };

      setSystemHealth(mockHealth);
    } catch (error) {
      console.error('Error refreshing health:', error);
    }
  };

  const value: MoolahContextType = {
    systemMetrics,
    systemHealth,
    isLoading,
    refreshMetrics,
    refreshHealth
  };

  return (
    <MoolahContext.Provider value={value}>
      {children}
    </MoolahContext.Provider>
  );
};

// Custom hook to use moolah context
export const useMoolah = (): MoolahContextType => {
  const context = useContext(MoolahContext);
  if (context === undefined) {
    throw new Error('useMoolah must be used within a MoolahProvider');
  }
  return context;
};
