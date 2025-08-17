const express = require('express');
const app = express();
const port = 3001; // Changed from 5050 to 3001 for frontend integration

// Middleware to parse JSON bodies
app.use(express.json());

// Define Routes
app.use('/api/vouchers', require('../routes/vouchers'));
app.use('/api/v1/users', require('../routes/users'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});