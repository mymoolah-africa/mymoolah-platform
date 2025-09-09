import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const ReportingAnalyticsOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Reporting & Analytics</h2>
          <p className="admin-text-body text-gray-600">
            Comprehensive reporting and analytics dashboard for business intelligence,
            performance metrics, and financial reporting across the platform.
          </p>
          <div className="mt-4 p-4 bg-teal-50 rounded-lg">
            <p className="admin-text-small text-teal-800">
              <strong>Features:</strong> Business intelligence, performance dashboards, 
              financial reports, custom analytics, and data export capabilities.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
