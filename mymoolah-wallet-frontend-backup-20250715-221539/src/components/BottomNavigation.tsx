import React from "react";
import { HomeIcon, WalletIcon, PlusCircleIcon, BellIcon, UserIcon } from "@heroicons/react/24/outline";

const iconClass = "h-6 w-6 text-mymoolah-blue"; // Standard icon size

const BottomNavigation = () => (
  <nav className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200">
    <div className="flex justify-between items-center max-w-md mx-auto px-6 py-2">
      <HomeIcon className={iconClass} />
      <WalletIcon className={iconClass} />
      <PlusCircleIcon className="h-8 w-8 text-mymoolah-green" />
      <BellIcon className={iconClass} />
      <UserIcon className={iconClass} />
    </div>
  </nav>
);

export default BottomNavigation;