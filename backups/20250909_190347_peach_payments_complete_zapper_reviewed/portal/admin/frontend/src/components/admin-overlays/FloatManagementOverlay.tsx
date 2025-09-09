import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const FloatManagementOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Float Management</h2>
          <p className="admin-text-body text-gray-600">
            Advanced float management system for suppliers, merchants, and dual-role entities.
            Monitor and manage float balances across the entire platform.
          </p>
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <p className="admin-text-small text-purple-800">
              <strong>Features:</strong> Float monitoring, balance reconciliation, 
              automated settlements, and dual-role entity management.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
