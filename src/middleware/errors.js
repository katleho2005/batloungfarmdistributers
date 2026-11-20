class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const PROVINCES = ['Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West'];

// Validation helpers (throw 400)
const need = (body, fields) => {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) throw new AppError(400, `Missing required field(s): ${missing.join(', ')}`);
};
const validateItems = (items, withCost) => {
  if (!Array.isArray(items) || !items.length) throw new AppError(400, 'items must be a non-empty array');
  items.forEach((it, i) => {
    if (!Number.isInteger(it.fruit_id)) throw new AppError(400, `Item ${i + 1}: fruit_id must be an integer`);
    if (!SIZES.includes(it.packaging_size)) throw new AppError(400, `Item ${i + 1}: packaging_size must be ${SIZES.join('/')}`);
    if (!Number.isInteger(it.quantity) || it.quantity <= 0) throw new AppError(400, `Item ${i + 1}: quantity must be a positive integer`);
    if (withCost && !(Number(it.unit_cost) > 0)) throw new AppError(400, `Item ${i + 1}: unit_cost must be greater than 0`);
  });
};
const notFound = (req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
const errorHandler = (err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A record with these unique details already exists' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Cannot delete: record is referenced by other data' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Referenced record does not exist' });
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code))
    return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
};
module.exports = { AppError, wrap, need, validateItems, notFound, errorHandler, SIZES, PROVINCES };
