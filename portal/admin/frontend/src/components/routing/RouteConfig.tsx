import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

import AdminLogin from '../../pages/AdminLogin';
import AdminDashboard from '../../pages/AdminDashboard';

import { UserManagementOverlay } from '../admin-overlays/UserManagementOverlay';
import { TransactionMonitoringOverlay } from '../admin-overlays/TransactionMonitoringOverlay';
import { FloatManagementOverlay } from '../admin-overlays/FloatManagementOverlay';
import { ServiceManagementOverlay } from '../admin-overlays/ServiceManagementOverlay';
import { SettlementManagementOverlay } from '../admin-overlays/SettlementManagementOverlay';
import { ReportingAnalyticsOverlay } from '../admin-overlays/ReportingAnalyticsOverlay';
import { SystemConfigurationOverlay } from '../admin-overlays/SystemConfigurationOverlay';
import { SecurityAuditOverlay } from '../admin-overlays/SecurityAuditOverlay';
import { PartnerOnboardingOverlay } from '../admin-overlays/PartnerOnboardingOverlay';
import { UnallocatedDepositsOverlay } from '../admin-overlays/UnallocatedDepositsOverlay';
import { DisbursementRunsOverlay } from '../admin-overlays/DisbursementRunsOverlay';
import { CreateDisbursementRunOverlay } from '../admin-overlays/CreateDisbursementRunOverlay';
import { DisbursementRunDetailOverlay } from '../admin-overlays/DisbursementRunDetailOverlay';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--muted)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export const RouteConfig: React.FC = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected admin routes — single AppLayoutWrapper shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayoutWrapper />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagementOverlay />} />
          <Route path="/admin/security" element={<SecurityAuditOverlay />} />
          <Route path="/admin/partners" element={<PartnerOnboardingOverlay />} />
          <Route path="/admin/transactions" element={<TransactionMonitoringOverlay />} />
          <Route path="/admin/floats" element={<FloatManagementOverlay />} />
          <Route path="/admin/settlements" element={<SettlementManagementOverlay />} />
          <Route path="/admin/services" element={<ServiceManagementOverlay />} />
          <Route path="/admin/system" element={<SystemConfigurationOverlay />} />
          <Route path="/admin/reports" element={<ReportingAnalyticsOverlay />} />
          <Route path="/admin/unallocated-deposits" element={<UnallocatedDepositsOverlay />} />
          <Route path="/admin/disbursements" element={<DisbursementRunsOverlay />} />
          <Route path="/admin/disbursements/create" element={<CreateDisbursementRunOverlay />} />
          <Route path="/admin/disbursements/:id" element={<DisbursementRunDetailOverlay />} />
        </Route>
      </Route>

      {/* Fallback redirects */}
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};
