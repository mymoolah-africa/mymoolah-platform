import React from "react";
import TopBanner from "../components/TopBanner";
import Logo from "../components/Logo";
import BalanceCards from "../components/BalanceCards";
import RecentTransactions from "../components/RecentTransactions";
import BottomNavigation from "../components/BottomNavigation";

const Dashboard = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <TopBanner />
    <div className="flex-1 flex flex-col items-center px-4 pb-20 pt-20 max-w-md mx-auto w-full">
      <Logo />
      <BalanceCards />
      <RecentTransactions />
    </div>
    <BottomNavigation />
  </div>
);

export default Dashboard;