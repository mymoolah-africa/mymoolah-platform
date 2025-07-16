import React from "react";

const RecentTransactions = () => (
  <div className="w-full mt-6">
    <h2 className="text-lg font-bold mb-2">Transaction History</h2>
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between py-2 border-b last:border-b-0">
        <span>Payment</span>
        <span className="text-mymoolah-blue">-R 100.00</span>
      </div>
      {/* Add more transactions as needed */}
    </div>
  </div>
);

export default RecentTransactions;