import { CheckCircle, XCircle, AlertTriangle, Clock, HelpCircle } from 'lucide-react';

const STATUS_CONFIG = {
  verified: { class: 'badge-verified', icon: CheckCircle, label: 'Verified' },
  forged: { class: 'badge-forged', icon: XCircle, label: 'Forged' },
  suspicious: { class: 'badge-suspicious', icon: AlertTriangle, label: 'Suspicious' },
  pending: { class: 'badge-pending', icon: Clock, label: 'Pending' },
  processing: { class: 'badge-pending', icon: Clock, label: 'Processing' },
  inconclusive: { class: 'badge-pending', icon: HelpCircle, label: 'Inconclusive' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const iconSize = size === 'lg' ? 16 : 12;

  return (
    <span className={`${config.class} ${size === 'lg' ? 'px-3 py-1 text-sm' : ''}`}>
      <Icon size={iconSize} className="mr-1" />
      {config.label}
    </span>
  );
}
