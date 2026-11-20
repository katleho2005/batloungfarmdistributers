const pool = require('../config/db');
const crud = require('./crud');
const Supplier = crud('suppliers', 'supplier_id', ['business_name', 'contact_person', 'phone', 'province', 'address']);
const Vendor = crud('vendors', 'vendor_id', ['vendor_name', 'phone', 'location', 'registration_date']);
const Fruit = crud('fruits', 'fruit_id', ['fruit_name', 'description', 'status']);

Vendor.search = (q) => Vendor.all('WHERE vendor_name LIKE ? OR phone LIKE ?', [`%${q}%`, `%${q}%`]);
Vendor.balances = async () => (await pool.query(
  `SELECT v.vendor_id, v.vendor_name, v.phone, COALESCE(SUM(s.total_amount),0) AS total_billed,
          COALESCE(SUM(s.amount_paid),0) AS total_paid, COALESCE(SUM(s.total_amount - s.amount_paid),0) AS outstanding
   FROM vendors v LEFT JOIN sales s ON s.vendor_id = v.vendor_id GROUP BY v.vendor_id, v.vendor_name, v.phone ORDER BY outstanding DESC`))[0];

// Registering a fruit also creates its SMALL/MEDIUM/LARGE stock rows with prices
Fruit.createWithStock = async (b) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('BEGIN');
    const [r] = await conn.query('INSERT INTO fruits (fruit_name,description,status) VALUES (?,?,?)', [b.fruit_name, b.description ?? null, b.status || 'ACTIVE']);
    const p = b.prices || {};
    await conn.query('INSERT INTO stock (fruit_id,packaging_size,available_quantity,selling_price) VALUES (?,?,0,?),(?,?,0,?),(?,?,0,?)',
      [r.insertId, 'SMALL', p.small || 0, r.insertId, 'MEDIUM', p.medium || 0, r.insertId, 'LARGE', p.large || 0]);
    await conn.query('COMMIT');
    return r.insertId;
  } catch (e) { await conn.query('ROLLBACK'); throw e; } finally { conn.release(); }
};
// Business constraint: suppliers with purchase history cannot be deleted
Supplier.hasPurchases = async (id) => (await pool.query('SELECT 1 FROM purchases WHERE supplier_id=? LIMIT 1', [id]))[0].length > 0;
module.exports = { Supplier, Vendor, Fruit };
