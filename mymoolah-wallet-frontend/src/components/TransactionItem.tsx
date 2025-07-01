import React from "react";

export default function TransactionItem({ transaction, onClick, formatDateTime, formatRand }) {
  const isDebit = transaction.type === "debit";
  const amountString = isDebit
    ? `-` + formatRand(transaction.amount)
    : formatRand(transaction.amount);

  return (
    <div
      className="flex items-center justify-between py-3 px-2 cursor-pointer hover:bg-gray-50 transition"
      onClick={onClick}
    >
      <div>
        <div className="font-semibold text-black">{transaction.description}</div>
        <div className="text-xs text-black">
          {formatDateTime(transaction.date)} • {transaction.reference}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${isDebit ? "text-red-600" : "text-black"}`}>
          {amountString}
        </div>
        <div className={`text-xs ${
          transaction.status === "success"
            ? "text-green-500"
            : transaction.status === "pending"
            ? "text-yellow-500"
            : "text-red-500"
        }`}>
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </div>
      </div>
    </div>
  );
}