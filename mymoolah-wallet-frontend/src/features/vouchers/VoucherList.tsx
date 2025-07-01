import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';

type Voucher = {
  id: number;
  code: string;
  amount: number;
  status: 'active' | 'redeemed' | 'expired';
  expiry: string;
};

const vouchers: Voucher[] = [
  { id: 1, code: 'ABC123', amount: 100, status: 'active', expiry: '2025-07-31' },
  { id: 2, code: 'XYZ789', amount: 50, status: 'redeemed', expiry: '2025-06-15' },
];

function handleRedeem(voucher: Voucher) {
  alert(`Redeem voucher ${voucher.code}`);
  // TODO: Call backend API to redeem
}

function handleSend(voucher: Voucher) {
  alert(`Send voucher ${voucher.code}`);
  // TODO: Open modal to enter recipient and call backend API
}

function handleBuy() {
  alert('Buy a new voucher');
  // TODO: Open modal to select amount and call backend API
}

function VoucherList() {
  return (
    <Card className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">Your Vouchers</h3>
        <Button onClick={handleBuy}>Buy Voucher</Button>
      </div>
      <ul>
        {vouchers.length === 0 ? (
          <li className="text-gray-400">No vouchers found.</li>
        ) : (
          vouchers.map(v => (
            <li key={v.id} className="flex justify-between items-center py-1 border-b last:border-b-0">
              <div>
                <span className="font-mono">{v.code}</span>
                <span className="ml-2 text-green-600">R {v.amount.toFixed(2)}</span>
                <span className={
                  "ml-2 " +
                  (v.status === 'active' ? 'text-green-500' :
                  v.status === 'redeemed' ? 'text-blue-500' :
                  'text-gray-400')
                }>
                  {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                </span>
                <span className="ml-2 text-gray-400 text-sm">{v.expiry}</span>
              </div>
              <div className="flex space-x-2">
                {v.status === 'active' && (
                  <>
                    <Button onClick={() => handleRedeem(v)}>Redeem</Button>
                    <Button onClick={() => handleSend(v)}>Send</Button>
                  </>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

export default VoucherList;