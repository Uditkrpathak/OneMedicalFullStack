import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Flame, TrendingDown } from 'lucide-react';

export default function PainHistory({ painAssessments, painMetrics }) {
  const list = painAssessments || [];
  const chartData = list.map((p, i) => ({
    session: `Day ${i + 1}`,
    date: new Date(p.date || p.recordedAt || p.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    score: p.painScore !== undefined ? p.painScore : (p.painLevel || 0),
  }));

  const baseline = painMetrics?.initialPain ?? (chartData[0]?.score ?? 0);
  const latest = painMetrics?.currentPain ?? (chartData[chartData.length - 1]?.score ?? baseline);
  const reduction = painMetrics?.painReductionPercent ?? (baseline > 0 ? Math.round(((baseline - latest) / baseline) * 100) : 0);

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Flame size={16} className="text-amber-500" /> Pain Score Progression
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Reported discomfort trend over the treatment timeline</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Baseline vs Current</div>
            <div className="text-xs font-bold text-slate-800">{baseline}/10 → {latest}/10</div>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200 flex items-center gap-1">
            <TrendingDown size={14} /> {reduction}% Reduced
          </div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="score" name="Pain Level (0-10)" stroke="#f59e0b" strokeWidth={2.5} fill="url(#painGrad)" dot={{ r: 4, fill: '#f59e0b' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
          No pain assessment entries recorded yet.
        </div>
      )}
    </div>
  );
}
