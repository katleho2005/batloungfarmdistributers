const pool = require('../config/db');
// Small factory: generic parameterised queries for simple tables
module.exports = (table, id, cols) => ({
  all: async (where = '', params = []) => (await pool.query(`SELECT * FROM ${table} ${where} ORDER BY ${id} DESC`, params))[0],
  one: async (i) => (await pool.query(`SELECT * FROM ${table} WHERE ${id}=?`, [i]))[0][0],
  create: async (b) => (await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${cols.map(() => '?')})`, cols.map((c) => b[c] ?? null)))[0].insertId,
  update: async (i, b) => {
    const k = cols.filter((c) => b[c] !== undefined);
    if (!k.length) return 0;
    return (await pool.query(`UPDATE ${table} SET ${k.map((c) => c + '=?').join(',')} WHERE ${id}=?`, [...k.map((c) => b[c]), i]))[0].affectedRows;
  },
  remove: async (i) => (await pool.query(`DELETE FROM ${table} WHERE ${id}=?`, [i]))[0].affectedRows,
});
