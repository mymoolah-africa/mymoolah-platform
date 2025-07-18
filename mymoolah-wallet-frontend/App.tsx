import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MoolahProvider } from './contexts/MoolahContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SendMoneyPage } from './pages/SendMoneyPage';
import { TransactPage } from './pages/TransactPage';
import { VouchersPage } from './pages/VouchersPage';
import { ProfilePage } from './pages/ProfilePage';
import { KYCStatusPage } from './pages/KYCStatusPage';
import { KYCDocumentsPage } from './pages/KYCDocumentsPage';

// Layout Components
import { MobileLayout } from './layouts/MobileLayout';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MoolahProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Protected Routes with Mobile Layout */}
                <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="send-money" element={<SendMoneyPage />} />
                  <Route path="transact" element={<TransactPage />} />
                  <Route path="vouchers" element={<VouchersPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* KYC Routes */}
                <Route path="/kyc/status" element={<KYCStatusPage />} />
                <Route path="/kyc/documents" element={<KYCDocumentsPage />} />
                
                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </MoolahProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}