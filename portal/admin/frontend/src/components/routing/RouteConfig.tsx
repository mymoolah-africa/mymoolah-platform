import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
  const token = sessionStorage.getItem('portal_token');
  const user = sessionStorage.getItem('portal_user');

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    JSON.parse(user);
  } catch {
    sessionStorage.removeItem('portal_token');
    sessionStorage.removeItem('portal_user');
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
