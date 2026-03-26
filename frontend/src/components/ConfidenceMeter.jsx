export default function ConfidenceMeter({ score, size = 'md' }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  const h = size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 ${h} bg-slate-800 rounded-full overflow-hidden`}>
        <div className={`${h} ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${textColor} font-mono text-sm font-semibold min-w-[3rem] text-right`}>{pct.toFixed(1)}%</span>
    </div>
  );
}
