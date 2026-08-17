import { CreditCard, CheckCircle2, Clock, IndianRupee } from 'lucide-react';

export default function PaymentsSection({ payments }) {
  const list = payments || [];
  const totalBilled = list.reduce((sum, p) => {
    const amt = p.amount || (p.amountPaise ? p.amountPaise / 100 : 0);
    return sum + amt;
  }, 0);

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard size={16} className="text-emerald-600" /> Patient Billing & Payments
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Session fee invoices and transaction receipts</p>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Settled</div>
          <div className="text-base font-black text-slate-900">₹{totalBilled.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {list.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="tbl w-full text-xs">
            <thead>
              <tr>
                <th>TRANSACTION ID</th>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th>METHOD</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="font-mono text-xs text-slate-600">#{p._id?.slice(-8)?.toUpperCase()}</td>
                  <td className="text-slate-500">
                    {new Date(p.createdAt || p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="font-bold text-slate-800">{p.description || p.serviceType || 'Physiotherapy Consultation'}</td>
                  <td>{p.method?.toUpperCase() || 'UPI / CARD'}</td>
                  <td className="font-bold text-slate-900">
                    ₹{((p.amount || (p.amountPaise ? p.amountPaise / 100 : 0))).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={p.status === 'PAID' || p.status === 'success' ? 'badge badge-green text-[10px]' : 'badge badge-slate text-[10px]'}>
                      ● {p.status?.toUpperCase() || 'PAID'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
          No billing transactions recorded for this patient.
        </div>
      )}
    </div>
  );
}
