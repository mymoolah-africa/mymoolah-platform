import React, { useState } from "react";
import TransactionList from "../components/TransactionList";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import { formatRand } from "../components/utils"; // Adjust path if needed

// Local utility function (do NOT export)
function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg", // GMT+2
  } as const;
  const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(date);
  const day = parts.find(p => p.type === "day")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const year = parts.find(p => p.type === "year")?.value;
  const hour = parts.find(p => p.type === "hour")?.value;
  const minute = parts.find(p => p.type === "minute")?.value;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

// Mock data for demonstration (with ISO timestamps)
const mockTransactions = [
  {
    id: "1",
    date: "2024-07-10T14:23:00Z",
    type: "credit",
    amount: 500,
    status: "success",
    description: "Wallet Top-up",
    reference: "TXN123456",
    details: { method: "Card", note: "Top-up via Visa" },
  },
  {
    id: "2",
    date: "2024-07-09T09:15:00Z",
    type: "debit",
    amount: -200,
    status: "success",
    description: "Send Money to John Doe",
    reference: "TXN123457",
    details: { recipient: "John Doe", note: "Payment for groceries" },
  },
  {
    id: "3",
    date: "2024-07-08T17:45:00Z",
    type: "voucher",
    amount: -100,
    status: "success",
    description: "Voucher Purchase",
    reference: "VCHR987654",
    details: { voucherCode: "VCH-2024-ABCD", expiry: "2024-12-31" },
  },
  {
    id: "4",
    date: "2024-07-07T12:00:00Z",
    type: "credit",
    amount: 300,
    status: "pending",
    description: "Received from Jane",
    reference: "TXN123458",
    details: { sender: "Jane Smith", note: "Gift" },
  },
  {
    id: "5",
    date: "2024-07-06T08:30:00Z",
    type: "debit",
    amount: -50,
    status: "success",
    description: "Airtime Purchase",
    reference: "TXN123459",
    details: { network: "Vodacom", number: "0821234567" },
  },
  {
    id: "6",
    date: "2024-07-05T15:10:00Z",
    type: "voucher",
    amount: -75,
    status: "success",
    description: "Voucher Purchase",
    reference: "VCHR987655",
    details: { voucherCode: "VCH-2024-EFGH", expiry: "2024-12-31" },
  },
  {
    id: "7",
    date: "2024-07-04T10:00:00Z",
    type: "credit",
    amount: 1000,
    status: "success",
    description: "Salary",
    reference: "TXN123460",
    details: { employer: "Acme Corp" },
  },
  {
    id: "8",
    date: "2024-07-03T19:20:00Z",
    type: "debit",
    amount: -120,
    status: "failed",
    description: "Failed Payment",
    reference: "TXN123461",
    details: { reason: "Insufficient funds" },
  },
  {
    id: "9",
    date: "2024-07-02T13:05:00Z",
    type: "voucher",
    amount: -60,
    status: "success",
    description: "Voucher Purchase",
    reference: "VCHR987656",
    details: { voucherCode: "VCH-2024-IJKL", expiry: "2024-12-31" },
  },
  {
    id: "10",
    date: "2024-07-01T11:40:00Z",
    type: "credit",
    amount: 250,
    status: "success",
    description: "Received from Mike",
    reference: "TXN123462",
    details: { sender: "Mike Brown", note: "Loan repayment" },
  },
  {
    id: "11",
    date: "2024-06-30T16:55:00Z",
    type: "debit",
    amount: -80,
    status: "success",
    description: "Electricity Purchase",
    reference: "TXN123463",
    details: { meter: "1234567890" },
  },
];

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
  { value: "voucher", label: "Voucher" },
  { value: "transfer", label: "Transfer" },
];

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "success", label: "Success" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

export default function TransactionHistory() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Filter and search logic
  const filteredTransactions = mockTransactions.filter((txn) => {
    const matchesSearch =
      txn.description.toLowerCase().includes(search.toLowerCase()) ||
      txn.reference.toLowerCase().includes(search.toLowerCase()) ||
      String(txn.amount).includes(search);
    const matchesType = typeFilter ? txn.type === typeFilter : true;
    const matchesStatus = statusFilter ? txn.status === statusFilter : true;
    const txnDate = new Date(txn.date);
    const matchesStart = startDate ? txnDate >= new Date(startDate) : true;
    const matchesEnd = endDate ? txnDate <= new Date(endDate) : true;
    return matchesSearch && matchesType && matchesStatus && matchesStart && matchesEnd;
  });

  // Sort by date descending
  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Show last 5 by default, all if showAll is true
  const displayedTransactions = showAll
    ? sortedTransactions
    : sortedTransactions.slice(0, );

  // Clear all filters and reset to default
  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setShowAll(false);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4 bg-white rounded shadow">
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <img
          src="/MyMoolahLogo2.svg"
          alt="MyMoolah Logo"
          className="h-14 w-auto"
        />
      </div>
      <h2 className="text-2xl font-bold mb-6 text-[#2D8CCA]">Transaction History</h2>
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by description, reference, or amount"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 shadow-sm"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 shadow-sm"
        >
          {typeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 shadow-sm"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 shadow-sm"
          />
        </div>
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition mt-4 md:mt-0"
        >
          Clear Filters
        </button>
      </div>
      <TransactionList
        transactions={displayedTransactions}
        onSelect={setSelected}
        formatDateTime={formatDateTime}
        formatRand={formatRand}
      />
      {/* View More / View Less Button */}
      {sortedTransactions.length > 10 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-[#2D8CCA] text-white rounded hover:bg-[#86BE41] transition"
          >
            {showAll ? "View Less" : "View More"}
          </button>
        </div>
      )}
      {selected && (
        <TransactionDetailsModal
          transaction={selected}
          onClose={() => setSelected(null)}
          formatDateTime={formatDateTime}
          formatRand={formatRand}
        />
      )}
    </div>
  );
}