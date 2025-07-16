import React from "react";

const BalanceCards = () => (
  <div className="w-full space-y-4 mt-4">
    <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
      <span className="text-gray-500 text-sm">Wallet Balance</span>
      <span className="text-2xl font-bold text-mymoolah-green">R 1,234.56</span>
    </div>
    {/* Add more cards as needed */}
  </div>
);

export default BalanceCards;