import React from "react";

export default function TransactionDetailsModal({ transaction, onClose, formatDateTime, formatRand }) {
  const isDebit = transaction.type === "debit";
  const amountString = isDebit
    ? `-` + formatRand(transaction.amount)
    : formatRand(transaction.amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-2 text-[#2D8CCA]">Transaction Details</h3>
        <div className="mb-2">
          <span className="font-semibold">Description:</span> <span className="text-black">{transaction.description}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Date & Time:</span> <span className="text-black">{formatDateTime(transaction.date)}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Reference:</span> <span className="text-black">{transaction.reference}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Type:</span> <span className="text-black">{transaction.type}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Amount:</span>{" "}
          <span className={isDebit ? "text-red-600 font-bold" : "text-black font-bold"}>
            {amountString}
          </span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Status:</span> <span className="text-black">{transaction.status}</span>
        </div>
        {/* Render extra details */}
        {transaction.details && (
          <div className="mt-4">
            <div className="font-semibold mb-1">Details:</div>
            <pre className="bg-gray-100 rounded p-2 text-sm overflow-x-auto">
              {JSON.stringify(transaction.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}