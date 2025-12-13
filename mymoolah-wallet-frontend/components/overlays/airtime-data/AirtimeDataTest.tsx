/**
 * Simple test component to verify routing works
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AirtimeDataTest() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      padding: '20px'
    }}>
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1F2937',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '24px',
          fontWeight: '700',
          color: '#1F2937',
          marginBottom: '16px'
        }}>
          🎯 Modern Airtime & Data UX
        </h1>
        
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '24px'
        }}>
          Route is working! Components will load here.
        </p>

        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #10B981',
          borderRadius: '12px',
          padding: '16px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: '#059669'
        }}>
          ✅ Authentication successful<br/>
          ✅ Route mounted correctly<br/>
          ✅ Component rendered<br/>
        </div>
      </div>
    </div>
  );
}

