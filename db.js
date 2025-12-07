// db.js
const mysql = require('mysql2');

// En desarrollo local sí usamos .env, en Railway no hace falta
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

// --- DEBUG: ver qué llega desde Railway / .env ---
console.log("DEBUG-DB-ENV:", {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME
});
// -------------------------------------------------

const pool = mysql.createPool({
    host: process.env.DB_HOST,        // mysql.railway.internal
    user: process.env.DB_USER,        // root
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,    // railway
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();
module.exports = db;
