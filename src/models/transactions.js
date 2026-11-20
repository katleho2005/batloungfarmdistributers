const pool = require('../config/db');
const { AppError } = require('../middleware/errors');

// ---- PURCHASE: all items succeed or nothing is saved ----
exports.createPurchase = async ({ supplier_id, items, purchase_date }) => {
  const c = await pool.getConnection();
  try {
    await c.query('BEGIN');
    const [s] = await c.query('SELECT 1 FROM suppliers WHERE supplier_id=?', [supplier_id]);
    if (!s.length) throw new AppError(404, `Supplier ${supplier_id} not found`);
    const [p] = await c.query('INSERT INTO purchases (supplier_id,purchase_date,total_amount) VALUES (?,?,0)', [supplier_id, purchase_date || new Date()]);
    let total = 0;
    for (const it of items) {
      const [f] = await c.query("SELECT 1 FROM fruits WHERE fruit_id=? AND status='ACTIVE'", [it.fruit_id]);
      if (!f.length) throw new AppError(404, `Fruit ${it.fruit_id} not found or inactive`);
      total += it.quantity * it.unit_cost;
      await c.query('INSERT INTO purchase_details (purchase_id,fruit_id,quantity,unit_cost,packaging_size) VALUES (?,?,?,?,?)',
        [p.insertId, it.fruit_id, it.quantity, it.unit_cost, it.packaging_size]);
      await c.query(`INSERT INTO stock (fruit_id,packaging_size,available_quantity,selling_price) VALUES (?,?,?,0)
                     ON DUPLICATE KEY UPDATE available_quantity = available_quantity + VALUES(available_quantity)`,
        [it.fruit_id, it.packaging_size, it.quantity]);
    }
    await c.query('UPDATE purchases SET total_amount=? WHERE purchase_id=?', [total, p.insertId]);
    await c.query('COMMIT');
    return { purchase_id: p.insertId, total_amount: total };
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
};

const statusOf = (paid, total) => (paid >= total ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

// ---- SALE: validates every item; any failure rolls back the whole sale ----
exports.createSale = async ({ vendor_id, items, payment_method = 'CREDIT', amount_paid, sale_date }) => {
  if (!['CASH', 'MOBILE_MONEY', 'CREDIT'].includes(payment_method)) throw new AppError(400, 'payment_method must be CASH, MOBILE_MONEY or CREDIT');
  const c = await pool.getConnection();
  try {
    await c.query('BEGIN');
    const [v] = await c.query('SELECT 1 FROM vendors WHERE vendor_id=?', [vendor_id]);
    if (!v.length) throw new AppError(404, `Vendor ${vendor_id} not found`);
    const [s] = await c.query('INSERT INTO sales (vendor_id,sale_date,total_amount) VALUES (?,?,0)', [vendor_id, sale_date || new Date()]);
    let total = 0;
    for (const it of items) {
      const [st] = await c.query('SELECT available_quantity, selling_price FROM stock WHERE fruit_id=? AND packaging_size=? FOR UPDATE', [it.fruit_id, it.packaging_size]);
      if (!st.length) throw new AppError(404, `No stock record for fruit ${it.fruit_id} (${it.packaging_size})`);
      if (st[0].available_quantity < it.quantity)
        throw new AppError(400, `Insufficient stock for fruit ${it.fruit_id} (${it.packaging_size}): requested ${it.quantity}, available ${st[0].available_quantity}`);
      total += it.quantity * st[0].selling_price;
      await c.query('INSERT INTO sales_details (sale_id,fruit_id,packaging_size,quantity,unit_price) VALUES (?,?,?,?,?)',
        [s.insertId, it.fruit_id, it.packaging_size, it.quantity, st[0].selling_price]);
      await c.query('UPDATE stock SET available_quantity = available_quantity - ? WHERE fruit_id=? AND packaging_size=?', [it.quantity, it.fruit_id, it.packaging_size]);
    }
    const paid = payment_method === 'CREDIT' ? 0 : Number(amount_paid ?? total);
    if (!(paid >= 0) || paid > total) throw new AppError(400, `amount_paid must be between 0 and ${total}`);
    await c.query('UPDATE sales SET total_amount=?, amount_paid=?, payment_method=?, payment_status=? WHERE sale_id=?',
      [total, paid, payment_method, statusOf(paid, total), s.insertId]);
    await c.query('COMMIT');
    return { sale_id: s.insertId, total_amount: total, amount_paid: paid, outstanding: total - paid, payment_status: statusOf(paid, total) };
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
};

// ---- Later payment against an existing sale ----
exports.addPayment = async (saleId, amount, method) => {
  if (!['CASH', 'MOBILE_MONEY'].includes(method)) throw new AppError(400, 'method must be CASH or MOBILE_MONEY');
  if (!(amount > 0)) throw new AppError(400, 'amount must be greater than 0');
  const c = await pool.getConnection();
  try {
    await c.query('BEGIN');
    const [r] = await c.query('SELECT total_amount, amount_paid FROM sales WHERE sale_id=? FOR UPDATE', [saleId]);
    if (!r.length) throw new AppError(404, `Sale ${saleId} not found`);
    const paid = r[0].amount_paid + amount;
    if (paid > r[0].total_amount) throw new AppError(400, `Payment exceeds balance of ${r[0].total_amount - r[0].amount_paid}`);
    await c.query('UPDATE sales SET amount_paid=?, payment_method=?, payment_status=? WHERE sale_id=?', [paid, method, statusOf(paid, r[0].total_amount), saleId]);
    await c.query('COMMIT');
    return { sale_id: Number(saleId), amount_paid: paid, outstanding: r[0].total_amount - paid, payment_status: statusOf(paid, r[0].total_amount) };
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
};

exports.listSales = async () => (await pool.query(
  `SELECT s.*, v.vendor_name, (s.total_amount - s.amount_paid) AS outstanding FROM sales s JOIN vendors v USING (vendor_id) ORDER BY sale_date DESC LIMIT 100`))[0];
exports.listPurchases = async () => (await pool.query(
  `SELECT p.*, s.business_name FROM purchases p JOIN suppliers s USING (supplier_id) ORDER BY purchase_date DESC LIMIT 100`))[0];
