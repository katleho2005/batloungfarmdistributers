const T = require('../models/transactions');
const R = require('../models/reports');
const Stock = require('../models/stock');
const { wrap, need, validateItems, AppError } = require('../middleware/errors');

exports.listPurchases = wrap(async (req, res) => res.json(await T.listPurchases()));
exports.createPurchase = wrap(async (req, res) => {
  need(req.body, ['supplier_id']); validateItems(req.body.items, true);
  res.status(201).json(await T.createPurchase(req.body));
});
exports.listSales = wrap(async (req, res) => res.json(await T.listSales()));
exports.createSale = wrap(async (req, res) => {
  need(req.body, ['vendor_id']); validateItems(req.body.items, false);
  res.status(201).json(await T.createSale(req.body));
});
exports.addPayment = wrap(async (req, res) => {
  need(req.body, ['amount', 'method']);
  res.json(await T.addPayment(req.params.id, Number(req.body.amount), req.body.method));
});
exports.revenue = wrap(async (req, res) => {
  const { from, to } = req.query;
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  if (!ok(from) || !ok(to)) throw new AppError(400, 'Use ?from=YYYY-MM-DD&to=YYYY-MM-DD');
  res.json({ from, to, ...(await R.revenue(from, to)) });
});
exports.topFruits = wrap(async (req, res) => res.json(await R.topFruits()));
exports.topVendor = wrap(async (req, res) => res.json(await R.topVendor()));
exports.summary = wrap(async (req, res) => {
  const t = Number(process.env.LOW_STOCK_THRESHOLD) || 10;
  const [totals, topFruits, daily, topVendor, lowItems] = await Promise.all([R.totals(t), R.topFruits(), R.daily(), R.topVendor(), Stock.low(t)]);
  res.json({ ...totals, topFruits, daily: daily.reverse(), topVendor, lowItems });
});
