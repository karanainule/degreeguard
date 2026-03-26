import { Link } from 'react-router-dom';
import { Shield, Search, Building2, FileCheck, AlertTriangle, Lock, Zap, ChevronRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-white">Authenticity Validator for Academia</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(76,110,245,0.5) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-brand-400">Document Authenticator</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Detect Fake Degrees.<br />
            <span className="text-brand-400">Protect Academic Integrity.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered certificate verification platform for higher education institutions. Cross-verify credentials in seconds with OCR, cryptographic hashing, and institutional database matching.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3 flex items-center gap-2">
              Start Verifying <ChevronRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3">
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white text-center mb-4">How It Works</h2>
          <p className="text-slate-500 text-center max-w-lg mx-auto mb-14">A comprehensive multi-layer verification pipeline ensuring maximum detection accuracy</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'Upload & Extract', desc: 'Upload certificate scans or PDFs. Our OCR engine extracts key fields — name, roll number, marks, certificate ID — automatically.', color: 'brand' },
              { icon: FileCheck, title: 'Cross-Verify', desc: 'Extracted data is matched against verified institutional databases using cryptographic hash comparison and metadata validation.', color: 'emerald' },
              { icon: AlertTriangle, title: 'Detect Anomalies', desc: 'AI flags tampering patterns — forged seals, invalid numbers, non-existent courses, duplicate documents, and formatting inconsistencies.', color: 'amber' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card p-6 group hover:border-slate-700 transition-all">
                  <div className={`w-11 h-11 bg-${f.color}-500/10 border border-${f.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={22} className={`text-${f.color}-400`} />
                  </div>
                  <h3 className="font-display font-semibold text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '5+', label: 'Institutions Registered' },
            { value: '100+', label: 'Certificates in Registry' },
            { value: '< 5s', label: 'Average Verification Time' },
            { value: '99.5%', label: 'Detection Accuracy' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-display text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stakeholders */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-12">Built For</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Building2, title: 'Employers', desc: 'Verify candidate credentials before hiring decisions' },
              { icon: Lock, title: 'Government Depts', desc: 'Authenticate certificates for schemes and recruitment' },
              { icon: Zap, title: 'Admission Offices', desc: 'Validate transfer certificates and prior qualifications' },
              { icon: Shield, title: 'Institutions', desc: 'Protect reputation by maintaining verified registries' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card-hover p-5 text-center">
                  <Icon size={24} className="text-brand-400 mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-white text-sm mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-brand-500" />
            <span className="text-sm text-slate-500">Authenticity Validator for Academia — Fake Degree Detection System</span>
          </div>
          <span className="text-xs text-slate-600">© 2025 Document Authenticator</span>
        </div>
      </footer>
    </div>
  );
}
