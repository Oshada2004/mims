const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');

// const staffRoutes = require('./routes/staffRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// const accountRoutes = require('./routes/accountRoutes');
// const transactionRoutes = require('./routes/transactionRoutes');
// const fdRoutes = require('./routes/fdRoutes');
// const jobRoutes = require('./routes/jobRoutes');
// const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());


// API Endpoints
app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/staff', staffRoutes);
// app.use('/api/v1/customers', customerRoutes);
// app.use('/api/v1/accounts', accountRoutes);
// app.use('/api/v1/transactions', transactionRoutes);
// app.use('/api/v1/fd', fdRoutes);
// app.use('/api/v1/jobs', jobRoutes);
// app.use('/api/v1/reports', reportRoutes);



// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err);
    if (err.sqlState === '45000') {
        return res.status(422).json({
            success: false,
            error: 'BusinessRuleViolation',
            message: err.message
        });
    }
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
