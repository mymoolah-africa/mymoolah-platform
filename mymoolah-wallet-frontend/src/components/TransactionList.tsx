import TransactionItem, { type Transaction } from "./TransactionItem";

interface TransactionListProps {
  transactions: Transaction[];
  onSelect: (txn: Transaction) => void;
  formatDateTime: (date: string) => string;
  formatRand: (amount: number) => string;
}

export default function TransactionList({ transactions, onSelect, formatDateTime, formatRand }: TransactionListProps) {
  if (!transactions.length) {
    return <div className="text-gray-500">No transactions found.</div>;
  }
  return (
    <div className="divide-y">
      {transactions.map((txn) => (
        <TransactionItem
          key={txn.id}
          transaction={txn}
          onClick={() => onSelect(txn)}
          formatDateTime={formatDateTime}
          formatRand={formatRand}
        />
      ))}
    </div>
  );
}