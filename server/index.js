const express = require('express');
const app = express();
const port = 5050; // or 3000, but 5050 matches your previous output

// Middleware to parse JSON bodies
app.use(express.json());

// Define Routes
app.use('/api/vouchers', require('./routes/voucher'));
app.use('/api/v1/users', require('./routes/users')); // <-- Add this line

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});