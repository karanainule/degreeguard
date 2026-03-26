import { useState, useEffect } from 'react';
import { GraduationCap, Search, Plus, Upload, QrCode, X } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [addForm, setAddForm] = useState({
    certificate_number: '', student_name: '', student_roll_number: '', father_name: '',
    course_name: '', branch: '', degree_type: 'bachelor', year_of_passing: '', cgpa: '',
    total_marks: '', obtained_marks: '', grade: '', date_of_issue: '', institution_id: ''
  });

  const fetchCerts = () => {
    setLoading(true);
    api.get('/certificates', { params: { search, page, limit: 20 } })
      .then(res => { setCertificates(res.data.certificates); setTotal(res.data.total); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCerts(); }, [search, page]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/certificates', addForm);
      toast.success('Certificate added');
      setShowAdd(false);
      fetchCerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add');
    }
  };

  const generateQR = async (id) => {
    try {
      const res = await api.get(`/certificates/${id}/qr`);
      setQrModal(res.data);
    } catch (err) {
      toast.error('Failed to generate QR code');
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'institution';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Certificates</h1>
          <p className="text-sm text-slate-500 mt-1">{total} certificates in registry</p>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Certificate
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="card p-6 animate-fade-in">
          <h3 className="font-display font-semibold text-white mb-4">Add New Certificate</h3>
          <form onSubmit={handleAdd} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Certificate Number *</label>
              <input value={addForm.certificate_number} onChange={e => setAddForm(p => ({ ...p, certificate_number: e.target.value }))} className="input-field text-sm font-mono" required />
            </div>
            <div>
              <label className="label-text">Student Name *</label>
              <input value={addForm.student_name} onChange={e => setAddForm(p => ({ ...p, student_name: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="label-text">Roll Number</label>
              <input value={addForm.student_roll_number} onChange={e => setAddForm(p => ({ ...p, student_roll_number: e.target.value }))} className="input-field text-sm font-mono" />
            </div>
            <div>
              <label className="label-text">Course Name *</label>
              <input value={addForm.course_name} onChange={e => setAddForm(p => ({ ...p, course_name: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="label-text">Degree Type *</label>
              <select value={addForm.degree_type} onChange={e => setAddForm(p => ({ ...p, degree_type: e.target.value }))} className="select-field text-sm">
                <option value="certificate">Certificate</option>
                <option value="diploma">Diploma</option>
                <option value="bachelor">Bachelor's</option>
                <option value="master">Master's</option>
                <option value="doctorate">Doctorate</option>
              </select>
            </div>
            <div>
              <label className="label-text">Year of Passing *</label>
              <input type="number" value={addForm.year_of_passing} onChange={e => setAddForm(p => ({ ...p, year_of_passing: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="label-text">CGPA</label>
              <input type="number" step="0.1" value={addForm.cgpa} onChange={e => setAddForm(p => ({ ...p, cgpa: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label-text">Father's Name</label>
              <input value={addForm.father_name} onChange={e => setAddForm(p => ({ ...p, father_name: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label-text">Date of Issue</label>
              <input type="date" value={addForm.date_of_issue} onChange={e => setAddForm(p => ({ ...p, date_of_issue: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary text-sm">Save Certificate</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9 text-sm" placeholder="Search by name, certificate number, roll number..." />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cert. No.</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Roll No.</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Institution</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Course</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Year</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">CGPA</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center"><span className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin inline-block" /></td></tr>
              ) : certificates.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-600">No certificates found</td></tr>
              ) : certificates.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-400">{c.certificate_number}</td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{c.student_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.student_roll_number || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.institution_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.course_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.year_of_passing}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-mono">{c.cgpa || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => generateQR(c.id)} className="text-brand-400 hover:text-brand-300 transition-colors" title="Generate QR Code">
                      <QrCode size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs disabled:opacity-30">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-ghost text-xs disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="card p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold text-white">Certificate QR Code</h3>
              <button onClick={() => setQrModal(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <img src={qrModal.qr_code} alt="QR Code" className="mx-auto rounded-lg" />
            <p className="text-xs text-slate-500 mt-4">Scan this QR code to verify the certificate</p>
          </div>
        </div>
      )}
    </div>
  );
}
