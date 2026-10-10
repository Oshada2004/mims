const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const accountRoutes = require('./routes/accountRoutes');
const staffRoutes = require('./routes/staffRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MIMS API is running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/staff', staffRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'API endpoint not found.'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err.message);
  res.status(500).json({
    error: 'An unexpected server error occurred.'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MIMS API running on port ${PORT}`);
});