import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate(user.role === 'admin' ? '/dashboard' : '/verify');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(76,110,245,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-brand-600/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            DegreeGuard<br />
            <span className="text-brand-400">Document Authenticator</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Protecting academic integrity through AI-powered certificate verification. Detect forged degrees, validate credentials, and safeguard institutional reputation.
          </p>
          <div className="space-y-3">
            {['OCR-powered document analysis', 'Cryptographic hash verification', 'Real-time anomaly detection', 'Institution registry integration'].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">DegreeGuard</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-1">Sign in to your account</h2>
          <p className="text-slate-500 mb-8">Enter your credentials to access the platform</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-text">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Register</Link>
          </p>

          <div className="mt-10 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 font-medium mb-2.5 uppercase tracking-wider">Demo Credentials</p>
            <div className="space-y-1.5 text-xs font-mono">
              <p className="text-slate-400"><span className="text-slate-600">Admin:</span> admin@degreeguard.in / admin123</p>
              <p className="text-slate-400"><span className="text-slate-600">Verifier:</span> verifier@company.com / verify123</p>
              <p className="text-slate-400"><span className="text-slate-600">Institution:</span> registrar@jspmrscoe.edu.in / inst123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
