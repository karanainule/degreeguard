import { useState } from 'react';
import { Search, Upload, FileText, CheckCircle, XCircle, AlertTriangle, Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import ConfidenceMeter from '../components/ConfidenceMeter';
import toast from 'react-hot-toast';

export default function VerifyPage() {
  const [mode, setMode] = useState('quick'); // quick | upload
  const [form, setForm] = useState({ certificate_number: '', student_name: '', institution_name: '', requester_name: '', requester_email: '', purpose: 'employment' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleQuickVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/verify/quick', form);
      setResult(res.data);
      if (res.data.status === 'verified') toast.success('Certificate verified!');
      else if (res.data.status === 'forged') toast.error('Forgery detected!');
      else toast('Verification inconclusive', { icon: '⚠️' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVerify = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file');
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('document', file);
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      const res = await api.post('/verify/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      toast.success('Document analyzed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setForm({ certificate_number: '', student_name: '', institution_name: '', requester_name: '', requester_email: '', purpose: 'employment' }); setFile(null); };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Verify Certificate</h1>
        <p className="text-sm text-slate-500 mt-1">Check the authenticity of any academic certificate</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => { setMode('quick'); setResult(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'quick' ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
          <Search size={16} /> Quick Verify
        </button>
        <button onClick={() => { setMode('upload'); setResult(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'upload' ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={mode === 'quick' ? handleQuickVerify : handleUploadVerify} className="space-y-5">
          {mode === 'upload' && (
            <div>
              <label className="label-text">Upload Certificate (PDF, PNG, JPG)</label>
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-700 rounded-xl hover:border-brand-500/50 transition-colors cursor-pointer bg-slate-900/50">
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp" onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <div className="flex items-center gap-2 text-brand-400">
                    <FileText size={20} />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-slate-600 mb-2" />
                    <span className="text-sm text-slate-500">Click to upload or drag & drop</span>
                  </>
                )}
              </label>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Certificate Number *</label>
              <input value={form.certificate_number} onChange={e => update('certificate_number', e.target.value)} className="input-field font-mono" placeholder="e.g. RU/2023/B.SC/001" required />
            </div>
            <div>
              <label className="label-text">Student Name</label>
              <input value={form.student_name} onChange={e => update('student_name', e.target.value)} className="input-field" placeholder="Full name as on certificate" />
            </div>
            <div>
              <label className="label-text">Institution Name</label>
              <input value={form.institution_name} onChange={e => update('institution_name', e.target.value)} className="input-field" placeholder="e.g. Ranchi University" />
            </div>
            <div>
              <label className="label-text">Purpose</label>
              <select value={form.purpose} onChange={e => update('purpose', e.target.value)} className="select-field">
                <option value="employment">Employment Verification</option>
                <option value="admission">Admission Verification</option>
                <option value="scholarship">Scholarship</option>
                <option value="government">Government Scheme</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Your Name</label>
              <input value={form.requester_name} onChange={e => update('requester_name', e.target.value)} className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="label-text">Your Email</label>
              <input type="email" value={form.requester_email} onChange={e => update('requester_email', e.target.value)} className="input-field" placeholder="your@email.com" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </button>
            {result && (
              <button type="button" onClick={reset} className="btn-secondary flex items-center gap-2">
                <RotateCcw size={16} /> New Verification
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className={`card p-6 animate-fade-in border-l-4 ${
          result.status === 'verified' ? 'border-l-emerald-500' :
          result.status === 'forged' ? 'border-l-red-500' :
          result.status === 'suspicious' ? 'border-l-amber-500' : 'border-l-slate-600'
        }`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-lg text-white mb-1">Verification Result</h3>
              <p className="text-xs text-slate-500 font-mono">ID: {result.verification_id}</p>
            </div>
            <StatusBadge status={result.status} size="lg" />
          </div>

          <div className="mb-5">
            <label className="label-text">Confidence Score</label>
            <ConfidenceMeter score={result.confidence_score} size="lg" />
          </div>

          {result.anomalies && result.anomalies.length > 0 && (
            <div className="mb-5">
              <label className="label-text flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-400" /> Anomalies Detected</label>
              <div className="space-y-2 mt-2">
                {result.anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                    <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-red-300">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.matched_certificate && (
            <div>
              <label className="label-text flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-400" /> Matched Record</label>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2 grid md:grid-cols-2 gap-3 text-sm">
                {Object.entries(result.matched_certificate).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-500 text-xs capitalize">{k.replace(/_/g, ' ')}</span>
                    <p className="text-slate-200 font-medium">{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
