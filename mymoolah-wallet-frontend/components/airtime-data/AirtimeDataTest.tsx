/**
 * Ultra-minimal test - ZERO dependencies
 */
import React from 'react';

export function AirtimeDataTest() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      padding: '20px'
    }}>
      <a href="/" style={{
        display: 'block',
        marginBottom: '24px',
        color: '#1F2937',
        textDecoration: 'none'
      }}>
        ← Back to Home
      </a>

      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h1>🎯 TEST ROUTE WORKS</h1>
        <p>If you see this, the route is fine.</p>
        <p>Problem is in the component.</p>
      </div>
    </div>
  );
}

