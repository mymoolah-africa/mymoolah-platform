import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const TransactionMonitoringOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Transaction Monitoring</h2>
          <p className="admin-text-body text-gray-600">
            Real-time transaction monitoring and management system for the MyMoolah Treasury Platform.
            Monitor all transactions across the platform with advanced filtering and analytics.
          </p>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="admin-text-small text-green-800">
              <strong>Features:</strong> Real-time monitoring, transaction filtering, 
              fraud detection, settlement tracking, and comprehensive reporting.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
