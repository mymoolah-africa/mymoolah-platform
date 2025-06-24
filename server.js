const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API is running'));
// Add more routes here

const PORT = process.env.PORT || 5050;
app.use('/api/hello', require('./routes/hello'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
