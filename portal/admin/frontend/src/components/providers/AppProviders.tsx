import React, { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { ClientAuthProvider } from '../../contexts/ClientAuthContext';
import { MoolahProvider } from '../../contexts/MoolahContext';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ClientAuthProvider>
          <MoolahProvider>
            {children}
          </MoolahProvider>
        </ClientAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
