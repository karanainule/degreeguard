import { useState, useEffect } from 'react';
import { FileCheck, Search, Filter } from 'lucide-react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import ConfidenceMeter from '../components/ConfidenceMeter';

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', purpose: '', search: '', page: 1 });

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.purpose) params.purpose = filters.purpose;
    if (filters.search) params.search = filters.search;
    params.page = filters.page;
    params.limit = 15;

    api.get('/verify', { params }).then(res => {
      setVerifications(res.data.verifications);
      setTotal(res.data.total);
    }).catch(console.error).finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Verification History</h1>
        <p className="text-sm text-slate-500 mt-1">{total} total verifications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))} className="input-field pl-9 text-sm" placeholder="Search by name, cert no, institution..." />
        </div>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))} className="select-field w-auto text-sm">
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="forged">Forged</option>
          <option value="suspicious">Suspicious</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filters.purpose} onChange={e => setFilters(p => ({ ...p, purpose: e.target.value, page: 1 }))} className="select-field w-auto text-sm">
          <option value="">All Purposes</option>
          <option value="employment">Employment</option>
          <option value="admission">Admission</option>
          <option value="scholarship">Scholarship</option>
          <option value="government">Government</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Certificate</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Institution</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Requester</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Purpose</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Confidence</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin inline-block" /></td></tr>
              ) : verifications.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-600">No verifications found</td></tr>
              ) : verifications.map(v => (
                <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{v.certificate_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{v.student_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{v.institution_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{v.requester_name}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500 capitalize">{v.purpose}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={v.verification_status} /></td>
                  <td className="px-4 py-3 w-40"><ConfidenceMeter score={v.confidence_score} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(v.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">Page {filters.page} of {Math.ceil(total / 15)}</span>
            <div className="flex gap-2">
              <button onClick={() => setFilters(p => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={filters.page <= 1} className="btn-ghost text-xs disabled:opacity-30">Previous</button>
              <button onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} disabled={filters.page >= Math.ceil(total / 15)} className="btn-ghost text-xs disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
