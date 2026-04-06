import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: string;
}

interface MoolahContextType {
  systemHealth: SystemHealth;
  isLoading: boolean;
  refreshHealth: () => Promise<void>;
}

const MoolahContext = createContext<MoolahContextType | undefined>(undefined);

interface MoolahProviderProps {
  children: ReactNode;
}

export const MoolahProvider: React.FC<MoolahProviderProps> = ({ children }) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'unknown',
    lastCheck: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshHealth = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/v1/admin/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth({
          status: data.success ? 'healthy' : 'warning',
          lastCheck: new Date().toISOString(),
        });
      } else {
        setSystemHealth({ status: 'warning', lastCheck: new Date().toISOString() });
      }
    } catch {
      setSystemHealth({ status: 'critical', lastCheck: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 60_000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  return (
    <MoolahContext.Provider value={{ systemHealth, isLoading, refreshHealth }}>
      {children}
    </MoolahContext.Provider>
  );
};

export const useMoolah = (): MoolahContextType => {
  const context = useContext(MoolahContext);
  if (context === undefined) {
    throw new Error('useMoolah must be used within a MoolahProvider');
  }
  return context;
};
