const mysql = require('mysql2');
require('dotenv').config();

// creamos un 'pool' de conexiones para manejar varias peticiones a la vez
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// exportamos la conexión usando promesas (async/await) para que sea moderno
const db = pool.promise();

module.exports = db;