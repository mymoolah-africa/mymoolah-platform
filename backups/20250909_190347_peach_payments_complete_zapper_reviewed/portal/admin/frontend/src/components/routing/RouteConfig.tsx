import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

// Core Portal Pages
import AdminLogin from '../../pages/AdminLoginSimple';
import AdminDashboard from '../../pages/AdminDashboard';

// Admin Management Overlays
import { UserManagementOverlay } from '../admin-overlays/UserManagementOverlay';
import { TransactionMonitoringOverlay } from '../admin-overlays/TransactionMonitoringOverlay';
import { FloatManagementOverlay } from '../admin-overlays/FloatManagementOverlay';
import { ServiceManagementOverlay } from '../admin-overlays/ServiceManagementOverlay';
import { SettlementManagementOverlay } from '../admin-overlays/SettlementManagementOverlay';
import { ReportingAnalyticsOverlay } from '../admin-overlays/ReportingAnalyticsOverlay';
import { SystemConfigurationOverlay } from '../admin-overlays/SystemConfigurationOverlay';
import { SecurityAuditOverlay } from '../admin-overlays/SecurityAuditOverlay';
import { PartnerOnboardingOverlay } from '../admin-overlays/PartnerOnboardingOverlay';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('portal_token');
    const user = localStorage.getItem('portal_user');
    return !!(token && user);
  };

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};

// Route Configuration Component
export const RouteConfig: React.FC = () => {
  return (
    <Routes>
      {/* ========================================================================
          AUTHENTICATION ROUTES - Public Access
          ======================================================================== */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* ========================================================================
          ADMIN PORTAL CORE ROUTES - Protected Access with Layout
          ======================================================================== */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <AdminDashboard />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      
      {/* ========================================================================
          USER & ACCESS MANAGEMENT ROUTES - Protected Access
          ======================================================================== */}
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <UserManagementOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      <Route path="/admin/security" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <SecurityAuditOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      <Route path="/admin/partners" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <PartnerOnboardingOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      
      {/* ========================================================================
          FINANCIAL MANAGEMENT ROUTES - Protected Access
          ======================================================================== */}
      <Route path="/admin/transactions" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <TransactionMonitoringOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      <Route path="/admin/floats" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <FloatManagementOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      <Route path="/admin/settlements" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <SettlementManagementOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      
      {/* ========================================================================
          SERVICE & SYSTEM MANAGEMENT ROUTES - Protected Access
          ======================================================================== */}
      <Route path="/admin/services" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <ServiceManagementOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      <Route path="/admin/system" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <SystemConfigurationOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      
      {/* ========================================================================
          ANALYTICS & REPORTING ROUTES - Protected Access
          ======================================================================== */}
      <Route path="/admin/reports" element={
        <ProtectedRoute>
          <AppLayoutWrapper>
            <ReportingAnalyticsOverlay />
          </AppLayoutWrapper>
        </ProtectedRoute>
      } />
      
      {/* ========================================================================
          REDIRECT ROUTES - Navigation & Fallbacks
          ======================================================================== */}
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};
