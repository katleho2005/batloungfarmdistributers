require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});
pool.checkConnection = async () => {
  try { (await pool.getConnection()).release(); console.log('MySQL connected'); return true; }
  catch (e) { console.error('MySQL connection failed:', e.message); return false; }
};
module.exports = pool;
