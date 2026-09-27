const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');
const accountRoutes = require('./src/routes/accountRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);

app.get('/api/test', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status_message: 'DB connected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});