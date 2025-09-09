import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const SystemConfigurationOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">System Configuration</h2>
          <p className="admin-text-body text-gray-600">
            System configuration and settings management for the MyMoolah Treasury Platform.
            Configure system parameters, integrations, and platform settings.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="admin-text-small text-gray-800">
              <strong>Features:</strong> System settings, integration configuration, 
              platform parameters, and environment management.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
