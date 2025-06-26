process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit();
});

console.log("Starting server...");
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Define Routes
app.use('/api/v1/users', require('./routes/users'));
<<<<<<< HEAD
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/wallets', require('./routes/wallets'));
app.use('/api/v1/transactions', require('./routes/transactions'));
app.use('/api/v1/vouchers', require('./routes/vouchers'));
app.use('/api/v1/kyc', require('./routes/kyc'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/vas', require('./routes/vas'));
app.use('/api/v1/support', require('./routes/support'));
app.use('/api/v1/serviceproviders', require('./routes/serviceproviders'));
app.use('/api/v1/merchants', require('./routes/merchants'));
=======
app.use('/api/v1/vouchers', require('./routes/vouchers'));
>>>>>>> d0a5e652ac99ef29ec2d653c3e0024003b20b6ec

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.post('/test', (req, res) => {
  res.json({ message: "Test route works!" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});