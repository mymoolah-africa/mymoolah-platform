// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import {
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  WalletIcon,
  TicketIcon,
  ArrowUpCircleIcon,
  BoltIcon,
  DevicePhoneMobileIcon,
  GiftIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  BellIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

// Helper for animated count-up
function useAnimatedNumber(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = (timestamp: number, startTime: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setValue(Math.floor(progress * (target - start) + start));
      if (progress < 1) requestAnimationFrame((t) => step(t, startTime));
    };
    requestAnimationFrame((t) => step(t, t));
  }, [target, duration]);
  return value;
}

export default function Dashboard() {
  // Mock data
  const walletBalance = 12500;
  const voucherBalance = 3500;

  const animatedWallet = useAnimatedNumber(walletBalance);
  const animatedVoucher = useAnimatedNumber(voucherBalance);

  // Transaction actions
  const actions = [
    {
      label: "Pay Beneficiary",
      icon: <ArrowUpCircleIcon className="h-8 w-8 text-[#2D8CCA]" />,
      to: "/pay-beneficiary",
    },
    {
      label: "Buy Electricity",
      icon: <BoltIcon className="h-8 w-8 text-[#86BE41]" />,
      to: "/buy-electricity",
    },
    {
      label: "Buy Airtime & Data",
      icon: <DevicePhoneMobileIcon className="h-8 w-8 text-[#2D8CCA]" />,
      to: "/buy-airtime",
    },
    {
      label: "Buy Vouchers",
      icon: <GiftIcon className="h-8 w-8 text-[#86BE41]" />,
      to: "/buy-vouchers",
    },
    {
      label: "International Payments",
      icon: <GlobeAltIcon className="h-8 w-8 text-[#2D8CCA]" />,
      to: "/international-payments",
    },
    {
      label: "Pay Bills",
      icon: <DocumentTextIcon className="h-8 w-8 text-[#86BE41]" />,
      to: "/pay-bills",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Top Banner */}
      <div className="relative bg-[#2D8CCA] h-16 flex items-center justify-center">
        <Link to="/profile" className="absolute left-4">
          <UserCircleIcon className="h-9 w-9 text-white" />
        </Link>
        <img src="/MyMoolahLogo1.svg" alt="MyMoolah Logo" className="h-8" />
        <Link to="/faq" className="absolute right-4">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
        </Link>
      </div>

      {/* Wallet Balance Banner */}
      <Link to="/transactions" className="block">
        <div className="flex items-center justify-between bg-[#86BE41] text-white rounded-xl mx-4 mt-4 px-4 py-3 shadow cursor-pointer">
          <div className="flex items-center">
            <WalletIcon className="h-8 w-8 mr-2" />
            <span className="font-semibold text-lg">My Wallet balance</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">R {animatedWallet.toLocaleString()}</span>
        </div>
      </Link>

      {/* Vouchers Balance Banner */}
      <Link to="/vouchers" className="block">
        <div className="flex items-center justify-between bg-[#2D8CCA] text-white rounded-xl mx-4 mt-3 px-4 py-3 shadow cursor-pointer">
          <div className="flex items-center">
            <TicketIcon className="h-8 w-8 mr-2" />
            <span className="font-semibold text-lg">My Vouchers balance</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">R {animatedVoucher.toLocaleString()}</span>
        </div>
      </Link>

      {/* Center Logo */}
      <div className="flex justify-center my-6">
        <img src="/MyMoolahLogo1.svg" alt="MyMoolah Logo" className="h-12" />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 px-4">
        {actions.map((action) => (
          <Link
            to={action.to}
            key={action.label}
            className="flex flex-col items-center justify-center bg-white rounded-xl shadow p-4 hover:bg-gray-100 transition"
          >
            {action.icon}
            <span className="mt-2 text-sm font-semibold text-gray-800 text-center">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Spacer to push bottom nav down */}
      <div className="flex-1" />

      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 shadow font-sans">
        <Link to="/dashboard" className="flex flex-col items-center text-[#2D8CCA]">
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs">Home</span>
        </Link>
        <Link to="/faq" className="flex flex-col items-center text-gray-500">
          <QuestionMarkCircleIcon className="h-6 w-6" />
          <span className="text-xs">FAQ</span>
        </Link>
        <Link to="/transact" className="flex flex-col items-center text-gray-500">
          <Squares2X2Icon className="h-6 w-6" />
          <span className="text-xs">Transact</span>
        </Link>
        <Link to="/messages" className="flex flex-col items-center text-gray-500">
          <BellIcon className="h-6 w-6" />
          <span className="text-xs">Messages</span>
        </Link>
        <Link to="/promotions" className="flex flex-col items-center text-gray-500">
          <SparklesIcon className="h-6 w-6" />
          <span className="text-xs">Promotions</span>
        </Link>
      </nav>
    </div>
  );
}