const express = require('express');
const app = express();

app.use(express.json());

// Register your routes
app.use('/api/clients', require('./routes/clients'));

// ...add other routes as needed

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));