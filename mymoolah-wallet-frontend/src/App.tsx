import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import MyMoolahLogin from './pages/MyMoolahLogin';
import ForgotPassword from './pages/ForgotPassword';
import Terms from './pages/Terms';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Register from './pages/Register';
import TransactionHistory from './pages/TransactionHistory';
import ChangeMobileNumber from './pages/ChangeMobileNumber';

function AppContent() {
  const location = useLocation();
  // Hide NavBar on authentication and onboarding pages
  const hideNavBar = [
    "/login",
    "/register",
    "/forgot-password",
    "/change-mobile",
    "/home",
    "/dashboard"
  ].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNavBar && <NavBar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<MyMoolahLogin />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/change-mobile" element={<ChangeMobileNumber />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}