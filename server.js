// Load environment variables
require('dotenv').config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit();
});

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5050;
const supportRoutes = require('./routes/support');

app.use(cors());
app.use(express.json());

app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/wallets', require('./routes/wallets'));
app.use('/api/v1/transactions', require('./routes/transactions'));
app.use('/api/v1/vouchers', require('./routes/vouchers'));
app.use('/api/v1/kyc', require('./routes/kyc'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/vas', require('./routes/vas'));
app.use('/api/v1/serviceproviders', require('./routes/serviceproviders'));
app.use('/api/v1/merchants', require('./routes/merchants'));
app.use('/api/v1/support', supportRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/test', (req, res) => {
  res.json({ message: "Test route works!" });
});
app.post('/test', (req, res) => {
  res.json({ message: "Test route works!" });
});
app.post('/debug', (req, res) => {
  console.log("Debug endpoint hit", req.body);
  res.json({ message: "Debug route works!" });
});

if (require.main === module) {
  console.log("Starting server...");
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app; // <-- Export the app for testing