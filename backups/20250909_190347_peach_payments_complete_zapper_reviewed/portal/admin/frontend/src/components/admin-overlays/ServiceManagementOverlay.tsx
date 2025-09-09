import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const ServiceManagementOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Service Management</h2>
          <p className="admin-text-body text-gray-600">
            Comprehensive service management system for all MyMoolah services including
            airtime, data, electricity, bill payments, and digital vouchers.
          </p>
          <div className="mt-4 p-4 bg-orange-50 rounded-lg">
            <p className="admin-text-small text-orange-800">
              <strong>Features:</strong> Service configuration, provider management, 
              pricing control, availability monitoring, and service analytics.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
