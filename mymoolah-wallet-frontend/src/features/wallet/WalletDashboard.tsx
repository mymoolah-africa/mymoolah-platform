import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import VoucherList from '../vouchers/VoucherList';

type Transaction = {
  id: number;
  type: string;
  amount: number;
  date: string;
};

const recentTransactions: Transaction[] = [
  { id: 1, type: 'Received', amount: 500, date: '2025-06-30' },
  { id: 2, type: 'Sent', amount: -200, date: '2025-06-29' },
  { id: 3, type: 'Airtime', amount: -50, date: '2025-06-28' },
];

function WalletDashboard() {
  const balance = 1250.75; // Placeholder, replace with real data later

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-2">Wallet Balance</h2>
        <div className="text-3xl font-mono text-green-600 mb-4">R {balance.toFixed(2)}</div>
        <div className="flex space-x-2">
          <Button>Send</Button>
          <Button>Receive</Button>
          <Button>Buy Airtime</Button>
          <VoucherList />
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-2">Recent Transactions</h3>
        <ul>
          {recentTransactions.length === 0 ? (
            <li className="text-gray-400">No transactions found.</li>
          ) : (
            recentTransactions.map(tx => (
              <li key={tx.id} className="flex justify-between py-1 border-b last:border-b-0">
                <span>{tx.type}</span>
                <span className={tx.amount < 0 ? 'text-red-500' : 'text-green-500'}>
                  {tx.amount < 0 ? '-' : '+'}R {Math.abs(tx.amount).toFixed(2)}
                </span>
                <span className="text-gray-400 text-sm">{tx.date}</span>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}

export default WalletDashboard;