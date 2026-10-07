const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const fdRoutes = require('./src/routes/fdRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const jobRoutes = require('./src/routes/jobRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/fd', fdRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/reports', reportRoutes);




app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM connection_test');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});