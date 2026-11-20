import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, useApi } from './api.js';
import { Gauges } from './Pages.jsx';

export default function Dashboard({ go }) {
  const { data: d, error } = useApi('/reports/summary');
  const { data: stock } = useApi('/stock');
  const { data: bal } = useApi('/vendors/balances');
  if (error) return <div className="alert">Could not load the dashboard: {error}</div>;
  if (!d) return <p className="muted">Loading…</p>;
  const owing = (bal || []).filter((v) => v.outstanding > 0);
  return (
    <>
      <header className="top">
        <div>
          <h1>Today at Batloung</h1>
          <p className="muted">{d.topVendor ? `${d.topVendor.vendor_name} is the biggest buyer so far, with ${d.topVendor.boxes_bought} boxes.` : 'No sales recorded yet.'}</p>
        </div>
        <button className="btn" onClick={() => go('sale')}>Record a sale</button>
      </header>

      <section className="stats">
        <div className="stat lead"><span>Revenue</span><b>{money(d.revenue)}</b></div>
        <div className="stat"><span>Owed by vendors</span><b className={d.outstanding > 0 ? 'warn' : ''}>{money(d.outstanding)}</b></div>
        <div className="stat"><span>Boxes in stock</span><b>{d.boxes_in_stock}</b></div>
        <div className="stat"><span>Low-stock lines</span><b className={d.low_stock_count ? 'bad' : ''}>{d.low_stock_count}</b></div>
      </section>

      <section className="grid2">
        <div className="card"><h2>Revenue by day</h2>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={d.daily}><CartesianGrid stroke="#dfe4dc" vertical={false} />
              <XAxis dataKey="day" tickLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
              <Tooltip formatter={(v) => money(v)} /><Area dataKey="revenue" stroke="#5B2A4E" fill="#5B2A4E" fillOpacity={0.15} strokeWidth={2} /></AreaChart>
          </ResponsiveContainer></div>
        <div className="card"><h2>Five best-selling fruits (boxes)</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={d.topFruits} layout="vertical"><XAxis type="number" hide />
              <YAxis type="category" dataKey="fruit_name" tickLine={false} axisLine={false} width={80} fontSize={13} />
              <Tooltip /><Bar dataKey="boxes_sold" fill="#E8962E" radius={4} /></BarChart>
          </ResponsiveContainer></div>
      </section>

      <section className="grid2">
        <div className="card"><h2>Stock by box size</h2><Gauges stock={stock || []} /></div>
        <div className="card"><h2>Running low</h2>
          {d.lowItems.length === 0 ? <p className="muted">Every size is above the minimum.</p> :
            <ul className="list">{d.lowItems.map((s) => <li key={s.stock_id}><span>{s.fruit_name} · {s.packaging_size.toLowerCase()}</span><b className="bad">{s.available_quantity} left</b></li>)}</ul>}
          <button className="link" onClick={() => go('purchase')}>Record a purchase</button>
          <h2 style={{ marginTop: 22 }}>Vendors with balances</h2>
          {owing.length === 0 ? <p className="muted">Nobody owes anything.</p> :
            <ul className="list">{owing.map((v) => <li key={v.vendor_id}><span>{v.vendor_name}</span><b className="warn">{money(v.outstanding)}</b></li>)}</ul>}
        </div>
      </section>
    </>
  );
}
