// Minimal test server for Cloud Run
console.log('🚀 Test server starting...');
console.log('📋 Node version:', process.version);
console.log('📋 PORT:', process.env.PORT || '8080');

const http = require('http');
const port = process.env.PORT || 8080;
const host = '0.0.0.0';

const server = http.createServer((req, res) => {
  console.log('📥 Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from MyMoolah Backend!\n');
});

server.listen(port, host, () => {
  console.log(`✅ Test server listening on ${host}:${port}`);
  console.log('✅ Server is ready!');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

