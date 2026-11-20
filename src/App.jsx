import { useState } from 'react';
import Dashboard from './Dashboard.jsx';
import { StockPage, DataPage, TradeForm } from './Pages.jsx';
import { PROVINCES } from './Pages.jsx';
import Reports from './reports.jsx';

const pages = [
  ['dashboard', 'Dashboard'], ['stock', 'Stock'], ['sale', 'New sale'], ['purchase', 'New purchase'],
  ['vendors', 'Vendors'], ['suppliers', 'Suppliers'], ['reports', '📊 Reports'],
];
const supplierFields = [['business_name', 'Business name'], ['contact_person', 'Contact person'], ['phone', 'Phone'],
  ['province', 'Province', PROVINCES], ['address', 'Address']];
const vendorFields = [['vendor_name', 'Vendor name'], ['phone', 'Phone'], ['location', 'Location']];

export default function App() {
  const [page, setPage] = useState('dashboard');
  return (
    <div className="shell">
      <nav className="side">
        <div className="brand"><b>Batloung Farm</b><span> distribution</span></div>
        {pages.map(([k, l]) => (
          <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>{l}</button>
        ))}
      </nav>
      <main>
        {page === 'dashboard' && <Dashboard go={setPage} />}
        {page === 'stock' && <StockPage />}
        {page === 'sale' && <TradeForm kind="sale" />}
        {page === 'purchase' && <TradeForm kind="purchase" />}
        {page === 'vendors' && <DataPage title="Vendors" path="/vendors" fields={vendorFields} search
          cols={['vendor_name', 'phone', 'location', 'registration_date']} />}
        {page === 'suppliers' && <DataPage title="Suppliers" path="/suppliers" fields={supplierFields}
          cols={['business_name', 'contact_person', 'phone', 'province']} idKey="supplier_id" deletable />}
        {page === 'reports' && <Reports />}
      </main>
      <footer className="app-footer">
        <div className="footer-left">
          <strong>🍎 Batloung Farm</strong>
          <span>Farm distribution • Maseru, Lesotho</span>
        </div>
        <div className="footer-right">
          <span>© 2026 Batloung Farm. All rights reserved.</span>
          <span>Made with ❤️ in Lesotho</span>
        </div>
      </footer>
    </div>
  );
}