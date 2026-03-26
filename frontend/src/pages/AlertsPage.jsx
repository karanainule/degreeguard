import { useState, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCircle, ShieldAlert, Eye, Filter } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SEVERITY_STYLES = {
  critical: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-amber-500 bg-amber-500/5',
  medium: 'border-l-brand-500 bg-brand-500/5',
  low: 'border-l-slate-500 bg-slate-500/5',
};

const SEVERITY_BADGES = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/20',
  high: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  medium: 'bg-brand-500/15 text-brand-400 border border-brand-500/20',
  low: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};

const TYPE_ICONS = {
  forgery_detected: ShieldAlert,
  suspicious_pattern: AlertTriangle,
  bulk_anomaly: Bell,
  blacklist_match: ShieldAlert,
  system: Bell,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchAlerts = () => {
    setLoading(true);
    const params = {};
    if (filter) params.severity = filter;
    api.get('/dashboard/alerts', { params }).then(res => setAlerts(res.data.alerts)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  const markRead = async (id) => {
    await api.patch(`/dashboard/alerts/${id}/read`);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
  };

  const resolve = async (id) => {
    await api.patch(`/dashboard/alerts/${id}/resolve`);
    toast.success('Alert resolved');
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: 1 } : a));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">Security alerts and system notifications</p>
      </div>

      <div className="flex gap-2">
        {['', 'critical', 'high', 'medium', 'low'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filter === s ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><span className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-slate-600">No alerts</div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const Icon = TYPE_ICONS[alert.type] || Bell;
            return (
              <div key={alert.id} className={`card border-l-4 p-5 ${SEVERITY_STYLES[alert.severity]} ${alert.is_read ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    <Icon size={20} className={alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-amber-400' : 'text-brand-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-white text-sm">{alert.title}</h3>
                      <span className={`badge text-[10px] ${SEVERITY_BADGES[alert.severity]}`}>{alert.severity}</span>
                      {alert.is_resolved ? <span className="badge-verified text-[10px]"><CheckCircle size={10} className="mr-0.5" /> Resolved</span> : null}
                    </div>
                    {alert.description && <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>}
                    <p className="text-[10px] text-slate-600 mt-2">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!alert.is_read && (
                      <button onClick={() => markRead(alert.id)} className="btn-ghost text-xs" title="Mark read"><Eye size={14} /></button>
                    )}
                    {!alert.is_resolved && (
                      <button onClick={() => resolve(alert.id)} className="text-xs text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded transition-colors">Resolve</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
