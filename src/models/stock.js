const pool = require('../config/db');
const base = `SELECT st.stock_id, st.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity, st.selling_price
              FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id`;
const order = `ORDER BY f.fruit_name, FIELD(st.packaging_size,'SMALL','MEDIUM','LARGE')`;
exports.all = async () => (await pool.query(`${base} ${order}`))[0];
exports.low = async (t) => (await pool.query(`${base} WHERE st.available_quantity < ? ${order}`, [t]))[0];
exports.setPrice = async (fruitId, size, price) =>
  (await pool.query('UPDATE stock SET selling_price=? WHERE fruit_id=? AND packaging_size=?', [price, fruitId, size]))[0].affectedRows;
