-- Create transactions table for MyMoolah Treasury Platform
-- This matches the migration: 20250729160842-create-transactions.js

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  "transactionId" VARCHAR(255),
  "walletId" VARCHAR(255) NOT NULL,
  "senderWalletId" VARCHAR(255),
  "receiverWalletId" VARCHAR(255),
  type VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  fee DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'ZAR',
  status VARCHAR(50) DEFAULT 'pending',
  reference VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions("walletId");
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions("createdAt");

-- Add comment
COMMENT ON TABLE transactions IS 'MyMoolah Treasury Platform - Transaction records for all wallet activities';
