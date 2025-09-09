import React from 'react';
import { AppLayoutWrapper } from '../layout/AppLayoutWrapper';

export const UserManagementOverlay: React.FC = () => {
  return (
    <AppLayoutWrapper>
      <div className="space-y-6">
        <div className="mymoolah-card p-6">
          <h2 className="admin-text-heading text-xl mb-4">User Management</h2>
          <p className="admin-text-body text-gray-600">
            Comprehensive user management system for the MyMoolah Treasury Platform.
            This overlay will provide complete user administration capabilities.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="admin-text-small text-blue-800">
              <strong>Coming Soon:</strong> User creation, role management, permissions, 
              bulk operations, and advanced user analytics.
            </p>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
};
