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

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.post('/test', (req, res) => {
  res.json({ message: "Test route works!" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});