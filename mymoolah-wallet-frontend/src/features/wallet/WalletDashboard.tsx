import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import VoucherList from '../vouchers/VoucherList';

// Placeholder user and data
const userName = 'André';
const balance = 1250.75; // Placeholder, replace with real data later
const openVouchers = 320.00; // Placeholder sum of open vouchers

const recentTransactions = [
  { id: 1, type: 'Received', amount: 500, date: '2025-06-30' },
  { id: 2, type: 'Sent', amount: -200, date: '2025-06-29' },
  { id: 3, type: 'Airtime', amount: -50, date: '2025-06-28' },
];

const navItems = [
  { label: 'Buy', color: 'bg-[#86BE41]', to: '/buy' },
  { label: 'Pay', color: 'bg-[#2D8CCA]', to: '/pay' },
  { label: 'Vouchers', color: 'bg-[#86BE41]', to: '/vouchers' },
  { label: 'Send Money', color: 'bg-[#2D8CCA]', to: '/send' },
];

function WalletDashboard() {
  return (
    <div className="max-w-xl mx-auto p-4 space-y-6 font-montserrat">
      {/* Logo and Greeting */}
      <div className="flex flex-col items-center mb-4">
        <img
          src="/MyMoolahLogo1.svg"
          alt="MyMoolah Logo"
          className="h-14 w-auto mb-2"
        />
        <h1 className="text-lg font-semibold text-gray-700">Hello, {userName} 👋</h1>
      </div>

      {/* Wallet Balance Card */}
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-[#2D8CCA]">Wallet Balance</h2>
        <div className="text-3xl font-mono text-[#86BE41] mb-4">R {balance.toFixed(2)}</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button>Send</Button>
          <Button>Receive</Button>
          <Button>Buy Airtime</Button>
        </div>
      </Card>

      {/* Open Vouchers Card */}
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-[#86BE41]">Open Vouchers</h2>
        <div className="text-2xl font-mono text-[#2D8CCA] mb-4">R {openVouchers.toFixed(2)}</div>
        <VoucherList />
      </Card>

      {/* Navigation Grid */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.to}
            className={`rounded-lg shadow-md flex items-center justify-center h-20 text-white text-lg font-bold transition-transform hover:scale-105 ${item.color}`}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-xl font-semibold mb-2 text-[#2D8CCA]">Recent Transactions</h3>
        <ul>
          {recentTransactions.length === 0 ? (
            <li className="text-gray-400">No transactions found.</li>
          ) : (
            recentTransactions.map(tx => (
              <li key={tx.id} className="flex justify-between py-1 border-b last:border-b-0">
                <span>{tx.type}</span>
                <span className={tx.amount < 0 ? 'text-red-500' : 'text-green-600'}>
                  {tx.amount < 0 ? '-' : '+'}R {Math.abs(tx.amount).toFixed(2)}
                </span>
                <span className="text-gray-400 text-sm">{tx.date}</span>
              </li>
            ))
          )}
        </ul>
        <div className="flex justify-end mt-2">
          <Button>View More</Button>
        </div>
      </Card>
    </div>
  );
}

export default WalletDashboard;