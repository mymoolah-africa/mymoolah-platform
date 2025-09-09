import React, { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { MoolahProvider } from '../../contexts/MoolahContext';
import { ErrorBoundary } from '../common/ErrorBoundary';

// App Providers Props
interface AppProvidersProps {
  children: ReactNode;
}

// App Providers Component - Wraps app with all necessary providers
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MoolahProvider>
          {children}
        </MoolahProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
