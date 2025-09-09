import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// ============================================================================
// MODULAR COMPONENTS - Clean Architecture
// ============================================================================
import { AppProviders } from './components/providers/AppProviders';
import { RouteConfig } from './components/routing/RouteConfig';

// ============================================================================
// STYLES - Centralized Design System
// ============================================================================
import './index.css';

// ============================================================================
// MAIN APP COMPONENT - Clean, Modular Architecture
// ============================================================================
const App: React.FC = () => {
  return (
    <AppProviders>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <RouteConfig />
        </div>
      </Router>
    </AppProviders>
  );
};

export default App;
