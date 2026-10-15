const mysql = require('mysql2/promise');
require('dotenv').config();
const { BANK_TIMEZONE } = require('./timezone');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'database',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mims_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    multipleStatements: true,
    // DATETIME/TIMESTAMP values are read and written as bank time.
    timezone: BANK_TIMEZONE,
    // DATE columns stay 'YYYY-MM-DD' strings: a calendar date has no time zone, and turning it into a
    // JavaScript Date would shift it (DATE '2026-10-15' -> "2026-10-14T18:30:00.000Z").
    dateStrings: ['DATE']
});

// Every new connection runs on bank time, whatever the MySQL server's own time zone is (a deployed
// server is often UTC). NOW(), CURDATE(), CURRENT_TIME() and TIMESTAMP columns then all use bank time,
// so the banking-hours check and stored times are right. mysql2 runs this before handing the
// connection to any caller, because queries on one connection execute in order.
pool.pool.on('connection', (connection) => {
    connection.query('SET time_zone = ?', [BANK_TIMEZONE], (error) => {
        if (error) console.error(`Could not set the session time zone to ${BANK_TIMEZONE}:`, error.message);
    });
});

module.exports = pool;
