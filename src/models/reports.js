const pool = require('../config/db');
const q = async (sql, p = []) => (await pool.query(sql, p))[0];
exports.topFruits = () => q(`SELECT f.fruit_name, SUM(sd.quantity) AS boxes_sold FROM sales_details sd
  JOIN fruits f ON f.fruit_id = sd.fruit_id GROUP BY f.fruit_id, f.fruit_name ORDER BY boxes_sold DESC LIMIT 5`);
exports.revenue = async (from, to) => (await q(`SELECT COALESCE(SUM(total_amount),0) AS revenue, COUNT(*) AS sales_count
  FROM sales WHERE DATE(sale_date) BETWEEN ? AND ?`, [from, to]))[0];
exports.topVendor = async () => (await q(`SELECT v.vendor_id, v.vendor_name, SUM(sd.quantity) AS boxes_bought FROM sales_details sd
  JOIN sales s ON s.sale_id = sd.sale_id JOIN vendors v ON v.vendor_id = s.vendor_id
  GROUP BY v.vendor_id, v.vendor_name ORDER BY boxes_bought DESC LIMIT 1`))[0] || null;
exports.daily = () => q(`SELECT DATE_FORMAT(sale_date,'%d %b') AS day, SUM(total_amount) AS revenue FROM sales
  GROUP BY DATE(sale_date), day ORDER BY DATE(sale_date) DESC LIMIT 14`);
exports.totals = async (t) => (await q(`SELECT
  (SELECT COALESCE(SUM(total_amount),0) FROM sales) AS revenue,
  (SELECT COALESCE(SUM(total_amount - amount_paid),0) FROM sales) AS outstanding,
  (SELECT COALESCE(SUM(available_quantity),0) FROM stock) AS boxes_in_stock,
  (SELECT COUNT(*) FROM stock WHERE available_quantity < ?) AS low_stock_count`, [t]))[0];
