import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, useApi } from './api.js';

export default function Reports() {
  const { data: d, error } = useApi('/reports/summary');
  const { data: bal } = useApi('/vendors/balances');
  const { data: sales } = useApi('/sales');
  const { data: purchases } = useApi('/purchases');
  if (error) return <div className="alert">Could not load reports: {error}</div>;
  if (!d) return <p className="muted">Loading…</p>;
  const owing = (bal || []).filter((v) => v.outstanding > 0);
  const totalPurchases = (purchases || []).reduce((t, p) => t + Number(p.total_amount || 0), 0);
  const profit = Number(d.revenue || 0) - totalPurchases;
  const totalPaid = Number(d.revenue || 0) - Number(d.outstanding || 0);

  const downloadCSV = () => {
    let csv = "Batloung Reports - All amounts in Maloti (M)\n";
    csv += `Total Revenue,${d.revenue}\nTotal Purchases,${totalPurchases}\nProfit,${profit}\nOwed,${d.outstanding}\nPaid,${totalPaid}\n\n`;
    csv += "Daily Revenue\nDay,Revenue\n";
    (d.daily || []).forEach(row => csv += `${row.day},${row.revenue}\n`);
    csv += "\nTop Fruits\nFruit,Boxes Sold\n";
    (d.topFruits || []).forEach(row => csv += `${row.fruit_name},${row.boxes_sold}\n`);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "batloung-report.csv"; a.click();
  };

  return (
    <>
      <header className="top">
        <div><h1>📊 Reports</h1><p className="muted"></p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>🖨️ Print</button>
          <button className="btn" onClick={downloadCSV} style={{ background: "#1a9a4a" }}>⬇️ Download Excel</button>
        </div>
      </header>
      <section className="stats">
        <div className="stat lead"><span>Total Revenue</span><b>{money(d.revenue)}</b></div>
        <div className="stat"><span>Total Purchases</span><b>{money(totalPurchases)}</b></div>
        <div className="stat"><span>Profit</span><b className={profit >= 0 ? '' : 'bad'}>{money(profit)}</b></div>
        <div className="stat"><span>Paid So Far</span><b>{money(totalPaid)}</b></div>
        <div className="stat"><span>Owed by vendors</span><b className={d.outstanding > 0 ? 'warn' : ''}>{money(d.outstanding)}</b></div>
        <div className="stat"><span>Boxes in stock</span><b>{d.boxes_in_stock}</b></div>
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
      <div className="card"><h2>Detail — All Sales + Purchases</h2>
        <table><thead><tr><th>Type</th><th>ID</th><th>Date</th><th>Amount</th><th>Status</th><th>Outstanding</th></tr></thead>
          <tbody>
            {(sales || []).map(s => <tr key={'s' + s.sale_id}><td>Sale</td><td>{s.sale_id}</td><td>{String(s.created_at || s.sale_date || '').slice(0, 10)}</td><td>{money(s.total_amount)}</td><td>{s.payment_status}</td><td>{money(s.outstanding)}</td></tr>)}
            {(purchases || []).map(p => <tr key={'p' + p.purchase_id}><td>Purchase</td><td>{p.purchase_id}</td><td>{String(p.created_at || p.purchase_date || '').slice(0, 10)}</td><td>{money(p.total_amount)}</td><td>-</td><td>-</td></tr>)}
          </tbody></table>
      </div>
    </>
  );
}