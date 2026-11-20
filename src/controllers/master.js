const { Supplier, Vendor, Fruit } = require('../models/master');
const Stock = require('../models/stock');
const { AppError, wrap, need, PROVINCES } = require('../middleware/errors');

const THRESH = () => Number(process.env.LOW_STOCK_THRESHOLD) || 10;
const getOr404 = async (M, id, label) => {
  const r = await M.one(id);
  if (!r) throw new AppError(404, `${label} ${id} not found`);
  return r;
};
const checkProvince = (b) => { if (b.province && !PROVINCES.includes(b.province)) throw new AppError(400, `province must be one of: ${PROVINCES.join(', ')}`); };

exports.suppliers = {
  list: wrap(async (req, res) => res.json(await Supplier.all())),
  get: wrap(async (req, res) => res.json(await getOr404(Supplier, req.params.id, 'Supplier'))),
  create: wrap(async (req, res) => {
    need(req.body, ['business_name', 'contact_person', 'phone', 'province', 'address']); checkProvince(req.body);
    res.status(201).json({ supplier_id: await Supplier.create(req.body) });
  }),
  update: wrap(async (req, res) => {
    await getOr404(Supplier, req.params.id, 'Supplier'); checkProvince(req.body);
    await Supplier.update(req.params.id, req.body); res.json(await Supplier.one(req.params.id));
  }),
  remove: wrap(async (req, res) => {
    await getOr404(Supplier, req.params.id, 'Supplier');
    if (await Supplier.hasPurchases(req.params.id)) throw new AppError(409, 'Cannot delete a supplier that has purchase records');
    await Supplier.remove(req.params.id); res.json({ message: 'Supplier deleted' });
  }),
};
exports.fruits = {
  list: wrap(async (req, res) => res.json(await Fruit.all("WHERE status='ACTIVE'"))),
  create: wrap(async (req, res) => { need(req.body, ['fruit_name']); res.status(201).json({ fruit_id: await Fruit.createWithStock(req.body) }); }),
  update: wrap(async (req, res) => {
    await getOr404(Fruit, req.params.id, 'Fruit');
    await Fruit.update(req.params.id, req.body);
    for (const [k, v] of Object.entries(req.body.prices || {})) await Stock.setPrice(req.params.id, k.toUpperCase(), v);
    res.json(await Fruit.one(req.params.id));
  }),
};
exports.stock = {
  list: wrap(async (req, res) => res.json(await Stock.all())),
  low: wrap(async (req, res) => res.json(await Stock.low(Number(req.query.threshold) || THRESH()))),
};
exports.vendors = {
  list: wrap(async (req, res) => res.json(req.query.search ? await Vendor.search(req.query.search) : await Vendor.all())),
  balances: wrap(async (req, res) => res.json(await Vendor.balances())),
  create: wrap(async (req, res) => {
    need(req.body, ['vendor_name', 'phone', 'location']);
    req.body.registration_date ||= new Date().toISOString().slice(0, 10);
    res.status(201).json({ vendor_id: await Vendor.create(req.body) });
  }),
  update: wrap(async (req, res) => {
    await getOr404(Vendor, req.params.id, 'Vendor');
    await Vendor.update(req.params.id, req.body); res.json(await Vendor.one(req.params.id));
  }),
};
