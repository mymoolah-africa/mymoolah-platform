import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const SettlementManagementOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Settlement Management</h2>
          <p className="admin-text-body text-gray-600">
            Advanced settlement management system for automated and manual settlements
            across all suppliers, merchants, and service providers.
          </p>
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
            <p className="admin-text-small text-indigo-800">
              <strong>Features:</strong> Automated settlements, manual processing, 
              reconciliation reports, and settlement analytics.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
