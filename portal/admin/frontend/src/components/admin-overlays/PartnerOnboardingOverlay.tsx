import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const PartnerOnboardingOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Partner Onboarding</h2>
          <p className="admin-text-body text-gray-600">
            Comprehensive partner onboarding system for suppliers, merchants, and service providers.
            Manage the complete onboarding process from application to activation.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="admin-text-small text-yellow-800">
              <strong>Features:</strong> Application management, KYC verification, 
              document processing, approval workflows, and partner activation.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
