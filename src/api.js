import { useEffect, useState } from 'react';
const BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export function useApi(path, refresh = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); api(path).then(setData).catch((e) => setError(e.message)); }, [path, refresh]);
  return { data, error };
}
export const money = (n) => 'M ' + Number(n || 0).toLocaleString('en-ZA', { maximumFractionDigits: 2 });
