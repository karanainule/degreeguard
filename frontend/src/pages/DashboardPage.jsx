import { useState, useEffect } from 'react';
import { Building2, GraduationCap, FileCheck, AlertTriangle, ShieldCheck, ShieldX, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

const PIE_COLORS = ['#40c057', '#fa5252', '#fcc419', '#748ffc', '#868e96'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(res => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>;
  if (!stats) return <div className="text-center text-slate-500 py-20">Failed to load dashboard data</div>;

  const { overview, by_purpose, recent_trend, top_institutions } = stats;
  const pieData = [
    { name: 'Verified', value: overview.verified },
    { name: 'Forged', value: overview.forged },
    { name: 'Suspicious', value: overview.suspicious },
    { name: 'Pending', value: overview.pending },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of the verification system</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: 'Institutions', value: overview.total_institutions, sub: `${overview.verified_institutions} verified`, color: 'brand' },
          { icon: GraduationCap, label: 'Certificates', value: overview.total_certificates, sub: 'in registry', color: 'emerald' },
          { icon: FileCheck, label: 'Verifications', value: overview.total_verifications, sub: `${overview.verified} verified`, color: 'violet' },
          { icon: ShieldX, label: 'Forgery Rate', value: `${overview.forgery_rate}%`, sub: `${overview.forged} forged detected`, color: 'red' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <Icon size={20} className={`text-${s.color}-400`} />
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">{s.label}</span>
              </div>
              <div className="font-display text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Verification Trend */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-brand-400" /> Verification Trend</h3>
          {recent_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={recent_trend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v.split('-').slice(1).join('/')} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="verified" fill="#40c057" radius={[3,3,0,0]} name="Verified" />
                <Bar dataKey="forged" fill="#fa5252" radius={[3,3,0,0]} name="Forged" />
                <Bar dataKey="suspicious" fill="#fcc419" radius={[3,3,0,0]} name="Suspicious" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm">No trend data yet</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Activity size={16} className="text-brand-400" /> Status Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-slate-400 flex-1">{d.name}</span>
                    <span className="text-slate-300 font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* By Purpose */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4">Verifications by Purpose</h3>
          <div className="space-y-3">
            {by_purpose.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 capitalize w-24">{p.purpose}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(p.count / (overview.total_verifications || 1)) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-300 font-mono w-8 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Institutions */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4">Top Institutions by Verification</h3>
          <div className="space-y-3">
            {top_institutions.map((inst, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-600 w-5">{i + 1}.</span>
                <span className="text-sm text-slate-300 flex-1 truncate">{inst.institution_name}</span>
                <span className="text-xs text-emerald-400 font-mono">{inst.verified_count}✓</span>
                <span className="text-xs text-red-400 font-mono">{inst.forged_count}✗</span>
              </div>
            ))}
            {top_institutions.length === 0 && <p className="text-slate-600 text-sm">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
