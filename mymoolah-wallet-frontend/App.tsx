// import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MoolahProvider } from './contexts/MoolahContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { BottomNavigation } from './components/BottomNavigation';
import { TopBanner } from './components/TopBanner';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { SendMoneyPage } from './pages/SendMoneyPage';
import { TransactPage } from './pages/TransactPage';
import { VouchersPage } from './pages/VouchersPage';
import { QRPaymentPage } from './pages/QRPaymentPage';
import { ProfilePage } from './pages/ProfilePage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { WalletSettingsPage } from './pages/WalletSettingsPage';
import { RequestMoneyPage } from './pages/RequestMoneyPage';
import { ServicesPage } from './pages/ServicesPage';
import { SupportPage } from './pages/SupportPage';
import FeedbackPage from './pages/FeedbackPage';
import { ReferralPage } from './pages/ReferralPage';
import { LoyaltyPromotionsPage } from './pages/LoyaltyPromotionsPage';

// Overlay Components
import { AirtimeDataOverlay } from './components/overlays/AirtimeDataOverlay';
// AirtimeDataOverlayModern - Available but using old overlay for stability in Codespaces
// import { AirtimeDataOverlayModern } from './components/overlays/airtime-data/AirtimeDataOverlayModern';
import { ElectricityOverlay } from './components/overlays/ElectricityOverlay';
import { BillPaymentOverlay } from './components/overlays/BillPaymentOverlay';
import { FlashEeziCashOverlay } from './components/overlays/flash-eezicash/FlashEeziCashOverlay';
import { MMCashRetailOverlay } from './components/overlays/mmcash-retail/MMCashRetailOverlay';
import { ATMCashSendOverlay } from './components/overlays/atm-cashsend/ATMCashSendOverlay';
import { TopupEasyPayOverlay } from './components/overlays/topup-easypay/TopupEasyPayOverlay';
import { CashoutEasyPayPage } from './pages/CashoutEasyPayPage';
import { DigitalVouchersOverlay } from './components/overlays/digital-vouchers/DigitalVouchersOverlay';

// KYC Pages
import { KYCDocumentsPage } from './pages/KYCDocumentsPage';
import { KYCStatusPage } from './pages/KYCStatusPage';

// Layout Components
// import { MobileLayout } from './layouts/MobileLayout';

function AppContent() {
  const location = useLocation();
  
  // Pages that should NOT show bottom navigation
  const pagesWithoutNavigation = ['/login', '/register', '/forgot-password', '/kyc', '/kyc/documents', '/kyc/status'];
  const showBottomNavigation = !pagesWithoutNavigation.includes(location.pathname);
  
  // Pages that should show the top banner (main app pages)
  const pagesWithTopBanner = ['/dashboard', '/send-money', '/transact', '/qr-payment', '/vouchers', '/profile', '/transactions', '/wallet-settings', '/request-money', '/services', '/support', '/feedback', '/electricity', '/bill-payments', '/referrals', '/airtime-data-overlay', '/electricity-overlay', '/bill-payment-overlay', '/flash-eezicash-overlay', '/mmcash-retail-overlay', '/atm-cashsend-overlay', '/topup-easypay', '/cashout-easypay', '/vouchers-overlay'];
  const showTopBanner = pagesWithTopBanner.includes(location.pathname);

  return (
    <div 
      style={{
        fontFamily: 'Montserrat, sans-serif',
        backgroundColor: '#ffffff',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Single Mobile Container - 375px max width, centered */}
      <div 
        style={{
          maxWidth: '375px',
          margin: '0 auto',
          height: '100vh',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Banner - only show on main app pages */}
        {showTopBanner && <TopBanner />}
        
        {/* Main Content Area - Flex 1 to take remaining space */}
        <div 
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#ffffff'
          }}
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* KYC Routes */}
            <Route path="/kyc" element={<ProtectedRoute><KYCDocumentsPage /></ProtectedRoute>} />
            <Route path="/kyc/documents" element={<ProtectedRoute><KYCDocumentsPage /></ProtectedRoute>} />
            <Route path="/kyc/status" element={<ProtectedRoute><KYCStatusPage /></ProtectedRoute>} />
            
            {/* FIXED: Direct protected routes - bypassing nested routing for now */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/send-money" element={<ProtectedRoute><SendMoneyPage /></ProtectedRoute>} />
            <Route path="/transact" element={<ProtectedRoute><TransactPage /></ProtectedRoute>} />
            <Route path="/qr-payment" element={<ProtectedRoute><QRPaymentPage /></ProtectedRoute>} />
            <Route path="/vouchers" element={<ProtectedRoute><VouchersPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/wallet-settings" element={<ProtectedRoute><WalletSettingsPage /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionHistoryPage /></ProtectedRoute>} />
            <Route path="/request-money" element={<ProtectedRoute><RequestMoneyPage /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="/loyalty-promotions" element={<ProtectedRoute><LoyaltyPromotionsPage /></ProtectedRoute>} />
            <Route path="/electricity" element={<ProtectedRoute><div>Electricity Page - Coming Soon</div></ProtectedRoute>} />
            <Route path="/bill-payments" element={<ProtectedRoute><div>Bill Payments Page - Coming Soon</div></ProtectedRoute>} />
            
            {/* Overlay Routes */}
            <Route path="/airtime-data-overlay" element={<ProtectedRoute><AirtimeDataOverlay /></ProtectedRoute>} />
            <Route path="/electricity-overlay" element={<ProtectedRoute><ElectricityOverlay /></ProtectedRoute>} />
            <Route path="/bill-payment-overlay" element={<ProtectedRoute><BillPaymentOverlay /></ProtectedRoute>} />
            <Route path="/flash-eezicash-overlay" element={<ProtectedRoute><FlashEeziCashOverlay /></ProtectedRoute>} />
            <Route path="/mmcash-retail-overlay" element={<ProtectedRoute><MMCashRetailOverlay /></ProtectedRoute>} />
            <Route path="/atm-cashsend-overlay" element={<ProtectedRoute><ATMCashSendOverlay /></ProtectedRoute>} />
            <Route path="/topup-easypay" element={<ProtectedRoute><TopupEasyPayOverlay /></ProtectedRoute>} />
            <Route path="/cashout-easypay" element={<ProtectedRoute><CashoutEasyPayPage /></ProtectedRoute>} />
            <Route path="/vouchers-overlay" element={<ProtectedRoute><DigitalVouchersOverlay /></ProtectedRoute>} />
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        {/* Bottom Navigation - Fixed at bottom, only show on main app pages */}
        {showBottomNavigation && (
          <div 
            style={{
              height: '80px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e5e7eb',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
              flexShrink: 0,
              position: 'relative',
              zIndex: 50
            }}
          >
            <BottomNavigation />
          </div>
        )}
        

      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MoolahProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </MoolahProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}