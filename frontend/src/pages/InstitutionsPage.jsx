import { useState, useEffect } from 'react';
import { Building2, Search, Plus, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function InstitutionsPage() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', code: '', type: 'university', city: '', established_year: '', accreditation: '' });

  const fetchInstitutions = () => {
    setLoading(true);
    api.get('/institutions', { params: { search, limit: 50 } })
      .then(res => { setInstitutions(res.data.institutions); setTotal(res.data.total); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchInstitutions(); }, [search]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/institutions', addForm);
      toast.success('Institution added');
      setShowAdd(false);
      setAddForm({ name: '', code: '', type: 'university', city: '', established_year: '', accreditation: '' });
      fetchInstitutions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add');
    }
  };

  const toggleVerify = async (id, current) => {
    try {
      await api.patch(`/institutions/${id}/status`, { is_verified: !current });
      toast.success(current ? 'Verification removed' : 'Institution verified');
      fetchInstitutions();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Institutions</h1>
          <p className="text-sm text-slate-500 mt-1">{total} registered institutions</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Institution
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-semibold text-white mb-4">Add New Institution</h3>
          <form onSubmit={handleAdd} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Name *</label>
              <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="label-text">Code *</label>
              <input value={addForm.code} onChange={e => setAddForm(p => ({ ...p, code: e.target.value }))} className="input-field text-sm font-mono" placeholder="e.g. RU001" required />
            </div>
            <div>
              <label className="label-text">Type *</label>
              <select value={addForm.type} onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))} className="select-field text-sm">
                <option value="university">University</option>
                <option value="college">College</option>
                <option value="institute">Institute</option>
                <option value="polytechnic">Polytechnic</option>
              </select>
            </div>
            <div>
              <label className="label-text">City</label>
              <input value={addForm.city} onChange={e => setAddForm(p => ({ ...p, city: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label-text">Established Year</label>
              <input type="number" value={addForm.established_year} onChange={e => setAddForm(p => ({ ...p, established_year: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label-text">Accreditation</label>
              <input value={addForm.accreditation} onChange={e => setAddForm(p => ({ ...p, accreditation: e.target.value }))} className="input-field text-sm" placeholder="e.g. NAAC A" />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary text-sm">Save Institution</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 text-sm" placeholder="Search institutions..." />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map(inst => (
            <div key={inst.id} className="card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-brand-400" />
                </div>
                <div className="flex items-center gap-2">
                  {inst.is_blacklisted ? (
                    <span className="badge bg-red-500/15 text-red-400 border border-red-500/20"><ShieldAlert size={12} className="mr-1" /> Blacklisted</span>
                  ) : inst.is_verified ? (
                    <span className="badge-verified"><CheckCircle size={12} className="mr-1" /> Verified</span>
                  ) : (
                    <span className="badge-pending">Unverified</span>
                  )}
                </div>
              </div>
              <h3 className="font-display font-semibold text-white text-sm mb-1">{inst.name}</h3>
              <div className="space-y-1 text-xs text-slate-500">
                <p><span className="text-slate-600">Code:</span> <span className="font-mono">{inst.code}</span></p>
                <p><span className="text-slate-600">Type:</span> <span className="capitalize">{inst.type}</span></p>
                {inst.city && <p><span className="text-slate-600">City:</span> {inst.city}, {inst.state}</p>}
                {inst.established_year && <p><span className="text-slate-600">Est.:</span> {inst.established_year}</p>}
                {inst.accreditation && <p><span className="text-slate-600">Accreditation:</span> {inst.accreditation}</p>}
              </div>
              {user?.role === 'admin' && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                  <button onClick={() => toggleVerify(inst.id, inst.is_verified)} className={`text-xs px-3 py-1 rounded ${inst.is_verified ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'} transition-colors`}>
                    {inst.is_verified ? 'Remove Verification' : 'Verify'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {institutions.length === 0 && (
            <div className="md:col-span-3 text-center py-12 text-slate-600">No institutions found</div>
          )}
        </div>
      )}
    </div>
  );
}
