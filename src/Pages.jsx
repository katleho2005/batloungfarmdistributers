import { useState } from 'react';
import { api, money, useApi } from './api.js';

export const PROVINCES = ['Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West'];
const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const LOW = 10;
const label = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Three fill bars per fruit, one per box size
export function Gauges({ stock }) {
  const fruits = [...new Set(stock.map((s) => s.fruit_name))];
  const max = Math.max(50, ...stock.map((s) => s.available_quantity));
  return (
    <div className="gauges">
      {fruits.map((f) => (
        <div className="grow" key={f}><span>{f}</span>
          {SIZES.map((z) => {
            const s = stock.find((x) => x.fruit_name === f && x.packaging_size === z);
            const q = s ? s.available_quantity : 0;
            return <div className="gauge" key={z} title={`${z.toLowerCase()}: ${q}`}><i className={q < LOW ? 'low' : ''} style={{ width: `${(q / max) * 100}%` }} /><em>{z[0]} {q}</em></div>;
          })}
        </div>
      ))}
    </div>
  );
}

export function StockPage() {
  const { data, error } = useApi('/stock');
  if (error) return <div className="alert">{error}</div>;
  return (
    <>
      <h1>Stock</h1><p className="muted">Each fruit is tracked separately for small, medium and large boxes. Red means fewer than {LOW} boxes.</p>
      <div className="card"><table><thead><tr><th>Fruit</th><th>Size</th><th>Boxes</th><th>Selling price</th></tr></thead>
        <tbody>{(data || []).map((s) => (
          <tr key={s.stock_id}><td>{s.fruit_name}</td><td>{s.packaging_size.toLowerCase()}</td>
            <td className={s.available_quantity < LOW ? 'bad' : ''}>{s.available_quantity}</td><td>{money(s.selling_price)}</td></tr>))}</tbody></table></div>
    </>
  );
}

// Generic list + add form (vendors and suppliers)
export function DataPage({ title, path, fields, cols, search, idKey = 'vendor_id', deletable }) {
  const [q, setQ] = useState(''), [form, setForm] = useState({}), [msg, setMsg] = useState(null), [tick, setTick] = useState(0);
  const { data, error } = useApi(search && q ? `${path}?search=${encodeURIComponent(q)}` : path, tick);
  const submit = async (e) => {
    e.preventDefault();
    try { await api(path, { method: 'POST', body: form }); setForm({}); setMsg({ ok: true, t: `${title.slice(0, -1)} saved.` }); setTick(tick + 1); }
    catch (err) { setMsg({ ok: false, t: err.message }); }
  };
  const del = async (id) => {
    try { await api(`${path}/${id}`, { method: 'DELETE' }); setTick(tick + 1); setMsg({ ok: true, t: 'Deleted.' }); }
    catch (err) { setMsg({ ok: false, t: err.message }); }
  };
  return (
    <>
      <h1>{title}</h1>
      <form className="card form" onSubmit={submit}>
        {fields.map(([k, l, opts]) => (
          <label key={k}>{l}
            {opts ? <select value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })}><option value="">Choose…</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
              : <input value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
          </label>))}
        <button className="btn">Save {title.slice(0, -1).toLowerCase()}</button>
        {msg && <p className={msg.ok ? 'ok' : 'alert'}>{msg.t}</p>}
      </form>
      {search && <input className="search" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />}
      {error && <div className="alert">{error}</div>}
      <div className="card"><table><thead><tr>{cols.map((c) => <th key={c}>{label(c)}</th>)}{deletable && <th />}</tr></thead>
        <tbody>{(data || []).map((r) => (
          <tr key={r[idKey]}>{cols.map((c) => <td key={c}>{String(r[c]).slice(0, 10) === r[c] || c !== 'registration_date' ? r[c] : String(r[c]).slice(0, 10)}</td>)}
            {deletable && <td><button className="link bad" onClick={() => del(r[idKey])}>Delete</button></td>}</tr>))}
          {data && !data.length && <tr><td colSpan={cols.length + 1} className="muted">Nothing found.</td></tr>}</tbody></table></div>
    </>
  );
}

// Multi-item sale / purchase form
export function TradeForm({ kind }) {
  const sale = kind === 'sale';
  const { data: parties } = useApi(sale ? '/vendors' : '/suppliers');
  const { data: fruits } = useApi('/fruits');
  const { data: stock } = useApi('/stock', 0);
  const blank = { fruit_id: '', packaging_size: 'LARGE', quantity: 1, unit_cost: '' };
  const [party, setParty] = useState(''), [items, setItems] = useState([blank]);
  const [method, setMethod] = useState('CASH'), [paid, setPaid] = useState(''), [msg, setMsg] = useState(null);
  const set = (i, k, v) => setItems(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const price = (it) => (stock || []).find((s) => s.fruit_id === +it.fruit_id && s.packaging_size === it.packaging_size)?.selling_price || 0;
  const total = items.reduce((t, it) => t + it.quantity * (sale ? price(it) : Number(it.unit_cost || 0)), 0);
  const submit = async () => {
    const body = { [sale ? 'vendor_id' : 'supplier_id']: +party,
      items: items.map((it) => ({ fruit_id: +it.fruit_id, packaging_size: it.packaging_size, quantity: +it.quantity, ...(sale ? {} : { unit_cost: +it.unit_cost }) })) };
    if (sale) { body.payment_method = method; if (method !== 'CREDIT' && paid !== '') body.amount_paid = +paid; }
    try {
      const r = await api(sale ? '/sales' : '/purchases', { method: 'POST', body });
      setMsg({ ok: true, t: `Saved. Total ${money(r.total_amount)}${sale ? ` · ${r.payment_status.replace('_', ' ').toLowerCase()}, ${money(r.outstanding)} outstanding` : ''}.` });
      setItems([blank]);
    } catch (e) { setMsg({ ok: false, t: e.message }); }
  };
  return (
    <>
      <h1>{sale ? 'New sale' : 'New purchase'}</h1>
      <div className="card form">
        <label>{sale ? 'Vendor' : 'Supplier'}
          <select value={party} onChange={(e) => setParty(e.target.value)}><option value="">Choose…</option>
            {(parties || []).map((p) => <option key={p.vendor_id || p.supplier_id} value={p.vendor_id || p.supplier_id}>{p.vendor_name || p.business_name}</option>)}</select></label>
        {items.map((it, i) => (
          <div className="row" key={i}>
            <select value={it.fruit_id} onChange={(e) => set(i, 'fruit_id', e.target.value)}><option value="">Fruit…</option>{(fruits || []).map((f) => <option key={f.fruit_id} value={f.fruit_id}>{f.fruit_name}</option>)}</select>
            <select value={it.packaging_size} onChange={(e) => set(i, 'packaging_size', e.target.value)}>{SIZES.map((z) => <option key={z} value={z}>{z.toLowerCase()}</option>)}</select>
            <input type="number" min="1" value={it.quantity} onChange={(e) => set(i, 'quantity', e.target.value)} aria-label="Boxes" />
            {sale ? <span className="muted">{money(price(it))} per box</span> : <input type="number" min="0" placeholder="Cost per box" value={it.unit_cost} onChange={(e) => set(i, 'unit_cost', e.target.value)} />}
            {items.length > 1 && <button type="button" className="link bad" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>}
          </div>))}
        <button type="button" className="link" onClick={() => setItems([...items, blank])}>Add another fruit</button>
        {sale && <div className="row"><select value={method} onChange={(e) => setMethod(e.target.value)}><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile money</option><option value="CREDIT">Credit (pay later)</option></select>
          {method !== 'CREDIT' && <input type="number" min="0" placeholder="Amount paid (blank = in full)" value={paid} onChange={(e) => setPaid(e.target.value)} />}</div>}
        <p className="total">Total {money(total)}</p>
        <button className="btn" onClick={submit}>{sale ? 'Complete sale' : 'Record purchase'}</button>
        {msg && <p className={msg.ok ? 'ok' : 'alert'}>{msg.t}</p>}
      </div>
    </>
  );
}

// ---------- REPORTS - ADDED, NO FILTER, MONEY IN M ----------
export function ReportsPage() {
  const { data: sales } = useApi('/sales');
  const { data: purchases } = useApi('/purchases');
  const { data: stock } = useApi('/stock');
  const { data: fruits } = useApi('/fruits');

  const sList = sales || [];
  const pList = purchases || [];

  const totalSales = sList.reduce((t, s) => t + Number(s.total_amount || 0), 0);
  const totalPurchases = pList.reduce((t, p) => t + Number(p.total_amount || 0), 0);
  const profit = totalSales - totalPurchases;
  const totalOwed = sList.reduce((t, s) => t + Number(s.outstanding || 0), 0);
  const totalPaid = totalSales - totalOwed;
  const paidCount = sList.filter(s => s.payment_status === 'PAID').length;
  const creditCount = sList.filter(s => s.payment_status !== 'PAID').length;

  // Top fruits - looks up fruit name from /fruits if sale only has fruit_id
  const fruitName = (id) => (fruits || []).find(f => f.fruit_id === id)?.fruit_name || `Fruit #${id || ''}`;
  const byFruit = {};
  sList.forEach(s => {
    // sale may have items array, or single fruit_id, or fruit_name
    const items = s.items || s.sale_items || [];
    if (items.length) {
      items.forEach(it => {
        const name = it.fruit_name || fruitName(it.fruit_id);
        byFruit[name] = (byFruit[name] || 0) + Number(it.quantity * (it.unit_price || it.selling_price || 0) || s.total_amount / items.length || 0);
      });
    } else {
      const name = s.fruit_name || (s.fruit_id ? fruitName(s.fruit_id) : 'Other');
      byFruit[name] = (byFruit[name] || 0) + Number(s.total_amount || 0);
    }
  });
  const topFruits = Object.entries(byFruit).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTop = topFruits[0]?.[1] || 1;

  const lowStock = (stock || []).filter(s => s.available_quantity < LOW);

  const downloadCSV = () => {
    let csv = "Type,ID,Date,Amount,Status,Outstanding\n";
    sList.forEach(s => csv += `Sale,${s.sale_id || ''},${String(s.created_at || s.sale_date || '').slice(0, 10)},${s.total_amount || ''},${s.payment_status || ''},${s.outstanding || ''}\n`);
    pList.forEach(p => csv += `Purchase,${p.purchase_id || ''},${String(p.created_at || p.purchase_date || '').slice(0, 10)},${p.total_amount || ''},, \n`);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "batloung-report.csv"; a.click();
  };

  return (
    <>
      <h1>Reports</h1>
      <p className="muted">All amounts in Maloti (M). No filter.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, margin: "16px 0" }}>
        <div className="card" style={{ borderLeft: "4px solid #1a9a4a" }}><small>TOTAL SALES</small><h2 style={{ color: "#1a9a4a" }}>{money(totalSales)}</h2><span>{sList.length} sales · {paidCount} paid · {creditCount} on credit</span></div>
        <div className="card" style={{ borderLeft: "4px solid #d32f2f" }}><small>TOTAL PURCHASES</small><h2 style={{ color: "#d32f2f" }}>{money(totalPurchases)}</h2><span>{pList.length} purchases</span></div>
        <div className="card" style={{ borderLeft: "4px solid #6d28d9" }}><small>PROFIT</small><h2 style={{ color: profit >= 0 ? "#6d28d9" : "#d32f2f" }}>{money(profit)}</h2><span>Sales - Purchases</span></div>
        <div className="card" style={{ borderLeft: "4px solid #ff7a1a" }}><small>STILL OWED TO YOU</small><h2 style={{ color: "#ff7a1a" }}>{money(totalOwed)}</h2><span>Paid: {money(totalPaid)}</span></div>
      </div>

      <div className="card">
        <h3>🏆 Top 5 Fruits Sold</h3>
        {topFruits.length === 0 && <p className="muted">No sales yet.</p>}
        {topFruits.map(([name, amt]) => (
          <div key={name} style={{ margin: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b>{name}</b><b>{money(amt)}</b></div>
            <div style={{ height: 10, background: "#f0eef5", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ width: `${(amt / maxTop) * 100}%`, height: "100%", background: "linear-gradient(90deg,#6d28d9,#ff7a1a)" }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>⚠️ Low Stock — less than {LOW} boxes</h3>
        {lowStock.length === 0 ? <p className="muted">All stock is OK.</p> : (
          <table><thead><tr><th>Fruit</th><th>Size</th><th>Boxes</th><th>Price</th></tr></thead>
            <tbody>{lowStock.map(s => <tr key={s.stock_id}><td>{s.fruit_name}</td><td>{s.packaging_size.toLowerCase()}</td><td className="bad">{s.available_quantity}</td><td>{money(s.selling_price)}</td></tr>)}</tbody></table>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
        <button className="btn" onClick={() => window.print()}>🖨️ Print Report</button>
        <button className="btn" onClick={downloadCSV} style={{ background: "#1a9a4a" }}>⬇️ Download Excel (CSV)</button>
      </div>

      <div className="card">
        <h3>Detail — {sList.length} Sales + {pList.length} Purchases</h3>
        <table><thead><tr><th>Type</th><th>ID</th><th>Date</th><th>Amount</th><th>Status</th><th>Outstanding</th></tr></thead>
          <tbody>
            {sList.map(s => <tr key={'s' + s.sale_id}><td>Sale</td><td>{s.sale_id}</td><td>{String(s.created_at || s.sale_date || '').slice(0, 10)}</td><td>{money(s.total_amount)}</td><td>{s.payment_status}</td><td>{money(s.outstanding)}</td></tr>)}
            {pList.map(p => <tr key={'p' + p.purchase_id}><td>Purchase</td><td>{p.purchase_id}</td><td>{String(p.created_at || p.purchase_date || '').slice(0, 10)}</td><td>{money(p.total_amount)}</td><td>-</td><td>-</td></tr>)}
            {sList.length === 0 && pList.length === 0 && <tr><td colSpan={6} className="muted">Nothing found.</td></tr>}
          </tbody></table>
      </div>
    </>
  );
}