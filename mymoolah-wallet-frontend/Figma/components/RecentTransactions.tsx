import { Icons } from "./Icons";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  time: string;
  type: 'credit' | 'debit';
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Payment to Store ABC',
    amount: -125.50,
    date: '2025-07-15',
    time: '14:30',
    type: 'debit'
  },
  {
    id: '2',
    description: 'Money received from John',
    amount: 500.00,
    date: '2025-07-15',
    time: '12:15',
    type: 'credit'
  },
  {
    id: '3',
    description: 'Airtime Purchase',
    amount: -50.00,
    date: '2025-07-14',
    time: '16:45',
    type: 'debit'
  },
  {
    id: '4',
    description: 'Electricity Payment',
    amount: -300.00,
    date: '2025-07-14',
    time: '09:20',
    type: 'debit'
  },
  {
    id: '5',
    description: 'Voucher Redemption',
    amount: 75.00,
    date: '2025-07-13',
    time: '18:10',
    type: 'credit'
  }
];

export function RecentTransactions() {
  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2);
    return amount >= 0 ? `+R ${formatted}` : `-R ${formatted}`;
  };

  const getAmountColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Recent Transactions
        </h2>
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Filter transactions"
        >
          <Icons.Filter />
        </button>
      </div>

      {/* Transactions List - Limited to 5 items */}
      <div className="space-y-3">
        {mockTransactions.slice(0, 5).map((transaction) => (
          <div 
            key={transaction.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {transaction.description}
                </p>
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {transaction.date} • {transaction.time}
                </p>
              </div>
              <div className="text-right ml-4">
                <p 
                  className={`font-bold text-lg ${getAmountColor(transaction.amount)}`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {formatAmount(transaction.amount)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}