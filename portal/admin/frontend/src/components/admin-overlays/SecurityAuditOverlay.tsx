import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const SecurityAuditOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">Security & Audit</h2>
          <p className="admin-text-body text-gray-600">
            Comprehensive security monitoring and audit system for the MyMoolah Treasury Platform.
            Monitor security events, audit logs, and compliance reporting.
          </p>
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="admin-text-small text-red-800">
              <strong>Features:</strong> Security monitoring, audit logs, compliance reporting, 
              threat detection, and security analytics.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
