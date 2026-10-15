const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Fail fast on missing security configuration instead of failing on the first transfer.
const { assertOtpConfig } = require('./utils/otp');
try {
  assertOtpConfig();
} catch (error) {
  console.error(`Startup aborted: ${error.message}`);
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const accountRoutes = require('./routes/accountRoutes');
const staffRoutes = require('./routes/staffRoutes');
const bankRoutes = require('./routes/bankRoutes');
const reportRoutes = require('./routes/reportRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const fdRoutes = require('./routes/fdRoutes');
const jobRoutes = require('./routes/jobRoutes');

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
app.use('/api/bank', bankRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/fd', fdRoutes);
app.use('/api/jobs', jobRoutes);

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