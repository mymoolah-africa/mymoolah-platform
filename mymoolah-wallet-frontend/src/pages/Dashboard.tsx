// src/pages/Dashboard.tsx

import React from "react";
import { Link } from "react-router-dom";
import { FaUserCircle, FaHeadset, FaWallet, FaGift, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaExchangeAlt, FaCog } from "react-icons/fa";
import Container from "../components/Container"; // Adjust path if needed

const quickActions = [
  {
    label: "Buy",
    icon: <FaGift className="text-2xl" />,
    to: "/buy",
  },
  {
    label: "Pay",
    icon: <FaMoneyBillWave className="text-2xl" />,
    to: "/pay",
  },
  {
    label: "Send",
    icon: <FaArrowUp className="text-2xl" />,
    to: "/send",
  },
  {
    label: "Withdraw",
    icon: <FaArrowDown className="text-2xl" />,
    to: "/withdraw",
  },
  {
    label: "Exchange",
    icon: <FaExchangeAlt className="text-2xl" />,
    to: "/exchange",
  },
  {
    label: "Settings",
    icon: <FaCog className="text-2xl" />,
    to: "/settings",
  },
];

const Dashboard: React.FC = () => {
  return (
    <Container>
      {/* Top Banner */}
      <div className="flex items-center justify-between py-4">
        // No import needed
        <img src="/MyMoolahLogo2.svg" alt="MyMoolah Logo" className="h-8" />
        <div className="flex items-center gap-4">
          <Link to="/support" aria-label="Support">
            <FaHeadset className="text-blue-600 text-2xl" />
          </Link>
          <Link to="/profile" aria-label="Profile">
            <FaUserCircle className="text-green-600 text-2xl" />
          </Link>
        </div>
      </div>

      {/* Wallet Banner */}
      <div className="bg-blue-100 rounded-xl p-4 flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-blue-700">Wallet Balance</div>
          <div className="text-2xl font-bold text-blue-900">R 12 345.67</div>
        </div>
        <FaWallet className="text-blue-500 text-3xl" />
      </div>

      {/* Voucher Banner */}
      <div className="bg-green-100 rounded-xl p-4 flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-green-700">Vouchers</div>
          <div className="text-lg font-semibold text-green-900">3 Available</div>
        </div>
        <FaGift className="text-green-500 text-2xl" />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="flex flex-col items-center justify-center bg-white rounded-lg shadow p-3 hover:bg-blue-50 transition"
          >
            {action.icon}
            <span className="mt-2 text-xs font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Sticky Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 z-50 max-w-md mx-auto">
        <Link to="/dashboard" className="flex flex-col items-center text-blue-600">
          <FaWallet className="text-xl" />
          <span className="text-xs">Wallet</span>
        </Link>
        <Link to="/vouchers" className="flex flex-col items-center text-green-600">
          <FaGift className="text-xl" />
          <span className="text-xs">Vouchers</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center text-gray-600">
          <FaUserCircle className="text-xl" />
          <span className="text-xs">Profile</span>
        </Link>
      </nav>
      {/* Add padding to bottom so content is not hidden behind nav */}
      <div className="pb-20" />
    </Container>
  );
};

export default Dashboard;