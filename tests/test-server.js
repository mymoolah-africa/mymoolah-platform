// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Only load auth routes for testing
app.use('/api/v1/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('MyMoolah Test Server - Auth Only');
});

app.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: "MyMoolah API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0-alpha"
  });
});

app.post('/test', (req, res) => {
  res.json({ 
    success: true,
    message: "Test POST route works!",
    body: req.body
  });
});

console.log("Starting test server...");
app.listen(port, () => {
  console.log(`✅ Test server running on port ${port}`);
  console.log(`🌐 Access: http://localhost:${port}`);
  console.log(`�� Test endpoint: http://localhost:${port}/test`);
  console.log(`🔐 Auth endpoint: http://localhost:${port}/api/v1/auth/register`);
});

module.exports = app;
