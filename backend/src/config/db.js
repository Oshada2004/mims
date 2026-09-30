const mysql = require('mysql2/promise');
// require('../../../.env').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mims_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    multipleStatements: true
});

module.exports = pool;