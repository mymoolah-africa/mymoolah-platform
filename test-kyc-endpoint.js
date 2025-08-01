const fetch = require('node-fetch');

async function testKYCEndpoint() {
  try {
    console.log('Testing KYC endpoint...');
    
    const response = await fetch('http://localhost:3001/api/v1/kyc/accepted-documents/id_document');
    const data = await response.json();
    
    console.log('✅ KYC endpoint working:', data);
    
    // Test the upload endpoint (without auth)
    const uploadResponse = await fetch('http://localhost:3001/api/v1/kyc/upload-documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    const uploadData = await uploadResponse.json();
    console.log('✅ Upload endpoint exists:', uploadData);
    
  } catch (error) {
    console.error('❌ Error testing KYC endpoint:', error.message);
  }
}

testKYCEndpoint(); 