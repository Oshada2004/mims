const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const reportRoutes = require('./src/routes/reportRoutes');


//Uncomment the following lines when auth.js is created

// const transactionRoutes = require('./src/routes/transactionRoutes');
// const fdRoutes = require('./src/routes/fdRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/reports', reportRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/fd', fdRoutes);

// Any URL that didn't match a route above gets a 404.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Catches errors passed with next(err) from the controllers. Broken JSON in a request body is the client's fault, so that's a 400 error.
// Anything else is logged here and the client would get a general message, so database details aren't sent back.
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Request body is not valid JSON.'
        });
    }

    console.error(err);
    res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Something went wrong on the server.'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MIMS server running on port ${PORT}`));