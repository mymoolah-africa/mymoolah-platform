import React from 'react';
// Placeholder: this overlay will be wired after design; exporting an empty shell to satisfy imports
export function ATMCashSendOverlay() {
  return (
    <div role="dialog" aria-labelledby="atm-cashsend-title" aria-describedby="atm-cashsend-desc" style={{ padding: '1rem' }}>
      <div id="atm-cashsend-desc" className="sr-only">Send a cash voucher to be collected at partner ATMs.</div>
      <h1 id="atm-cashsend-title" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700 }}>ATM Cash Send</h1>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#6b7280' }}>Overlay placeholder. Design will be supplied by Figma.</p>
    </div>
  );
}


