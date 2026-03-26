import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'verifier' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully!');
      navigate('/verify');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Shield size={22} className="text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">DegreeGuard</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-white mb-1">Create an account</h2>
        <p className="text-slate-500 mb-8">Register to verify certificates or manage institutional records</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text">Full Name</label>
            <input value={form.full_name} onChange={e => update('full_name', e.target.value)} className="input-field" placeholder="Your full name" required />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input-field" placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="label-text">Role</label>
            <select value={form.role} onChange={e => update('role', e.target.value)} className="select-field">
              <option value="verifier">Verifier (Employer / Agency)</option>
              <option value="institution">Institution Representative</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
