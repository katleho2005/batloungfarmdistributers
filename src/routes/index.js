const r = require('express').Router();
const M = require('../controllers/master');
const T = require('../controllers/trade');

r.route('/suppliers').get(M.suppliers.list).post(M.suppliers.create);
r.route('/suppliers/:id').get(M.suppliers.get).put(M.suppliers.update).delete(M.suppliers.remove);
r.route('/fruits').get(M.fruits.list).post(M.fruits.create);
r.put('/fruits/:id', M.fruits.update);
r.get('/stock', M.stock.list);
r.get('/stock/low', M.stock.low);
r.route('/vendors').get(M.vendors.list).post(M.vendors.create); // ?search=name or phone
r.get('/vendors/balances', M.vendors.balances);
r.put('/vendors/:id', M.vendors.update);
r.route('/purchases').get(T.listPurchases).post(T.createPurchase);
r.route('/sales').get(T.listSales).post(T.createSale);
r.post('/sales/:id/payments', T.addPayment);
r.get('/reports/summary', T.summary);
r.get('/reports/top-fruits', T.topFruits);
r.get('/reports/revenue', T.revenue);
r.get('/reports/top-vendor', T.topVendor);
module.exports = r;
