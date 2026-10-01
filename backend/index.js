const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');
const accountRoutes = require('./src/routes/accountRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const fdRoutes = require('./src/routes/fdRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/reports', reportRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/fd', fdRoutes);

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