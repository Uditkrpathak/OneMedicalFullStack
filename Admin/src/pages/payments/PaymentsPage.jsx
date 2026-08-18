import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, TrendingUp, Clock, AlertCircle, Plus, Download,
  Search, Filter, ChevronDown, MoreVertical, CheckCircle2,
  FileText, RefreshCcw, X, Check, Send, Users, IndianRupee, RefreshCw
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

const TABS = ['Transactions', 'Invoices', 'Payouts', 'Refunds'];

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function PaymentsPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Transactions');
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [patients, setPatients] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invPatientId, setInvPatientId] = useState('');
  const [invService, setInvService] = useState('Physiotherapy Care Protocol');
  const [invAmount, setInvAmount] = useState('1500');
  const [invSubmitting, setInvSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, invRes, poRes, refRes, patRes] = await Promise.allSettled([
        api.listPayments(token, { page, limit: 20, search: searchQuery }),
        api.listInvoices(token),
        api.listPayouts(token),
        api.listRefunds(token),
        api.listPatients(token, { limit: 100 }),
      ]);

      if (txRes.status === 'fulfilled' && txRes.value?.data) {
        const raw = txRes.value.data;
        const formatted = raw.map(t => {
          const rawAmt = t.amount || t.paidAmount || (t.amountPaise ? t.amountPaise / 100 : (t.paise ? t.paise / 100 : 1200));
          const amt = rawAmt > 10000 ? Math.round(rawAmt / 100) : rawAmt;
          return {
            _id: t._id,
            id: t._id?.slice(-8)?.toUpperCase() || 'TX-000',
            patientName: t.patientName || t.user?.name || 'Patient',
            therapistName: t.therapistName || 'Specialist',
            type: t.serviceType?.replace(/_/g, ' ') || 'Consultation Session',
            amount: amt,
            date: new Date(t.createdAt || t.date || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
            method: (t.method || 'UPI / Gateway').toUpperCase(),
            status: (t.status || 'PAID').toUpperCase(),
          };
        });
        setTransactions(formatted);
        setTotal(txRes.value.meta?.total ?? formatted.length);
      } else if (txRes.status === 'rejected') {
        throw new Error(txRes.reason?.message || 'Failed to load payments.');
      }

      if (invRes.status === 'fulfilled' && invRes.value?.data) {
        setInvoices(invRes.value.data);
      }
      if (poRes.status === 'fulfilled' && poRes.value?.data) {
        setPayouts(poRes.value.data);
      }
      if (refRes.status === 'fulfilled' && refRes.value?.data) {
        setRefunds(refRes.value.data);
      }
      if (patRes.status === 'fulfilled' && patRes.value?.data) {
        setPatients(patRes.value.data);
        if (patRes.value.data.length > 0 && !invPatientId) {
          setInvPatientId(patRes.value.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load financial records:', err);
      setError(err.message || 'Failed to connect to billing engine.');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateInvoiceSubmit = async e => {
    e.preventDefault();
    if (!invPatientId || !invAmount) return;
    setInvSubmitting(true);
    try {
      await api.createInvoice(token, {
        patientId: invPatientId,
        service: invService,
        amount: Number(invAmount),
      });
      showToast('Invoice generated successfully!');
      setShowInvoiceModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create invoice.');
    } finally {
      setInvSubmitting(false);
    }
  };

  const handleApproveRefund = async refundId => {
    try {
      await api.approveRefund(token, refundId);
      showToast('Refund approved and routed to gateway.');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve refund.');
    }
  };

  const totalCollected = transactions.reduce((acc, t) => acc + (t.status === 'PAID' ? t.amount : 0), 0);
  const pendingAmount = transactions.reduce((acc, t) => acc + (t.status === 'PENDING' ? t.amount : 0), 0);

  return (
    <div className="space-y-6 animate-fade-up text-slate-800 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Billing & Financial Settlements</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time payment transactions, invoices, clinician payouts and refunds.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> Create Invoice
          </button>
        </div>
      </div>

      {/* ── METRIC STATS ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-white border border-slate-200 border-l-4 border-l-emerald-600">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Settled Revenue</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{fmt(totalCollected)}</div>
        </div>
        <div className="card p-5 bg-white border border-slate-200 border-l-4 border-l-amber-500">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Pending Invoices / Holds</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{fmt(pendingAmount)}</div>
        </div>
        <div className="card p-5 bg-white border border-slate-200 border-l-4 border-l-blue-600">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Processed Transactions</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{total}</div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="border-b border-slate-200 flex gap-2 text-xs">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── 4-STATE CONTAINER ── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Financial Records</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : activeTab === 'Transactions' ? (
        transactions.length === 0 ? (
          <EmptyState
            title="No transactions recorded"
            subtitle="Processed session and package payments will be displayed here."
          />
        ) : (
          <div className="card overflow-hidden bg-white border border-slate-200">
            <div className="overflow-x-auto">
              <table className="tbl w-full text-xs">
                <thead>
                  <tr>
                    <th>TRANSACTION ID</th>
                    <th>DATE</th>
                    <th>PATIENT</th>
                    <th>SPECIALIST</th>
                    <th>SERVICE</th>
                    <th>METHOD</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="font-mono font-bold text-slate-600">#{t.id}</td>
                      <td>{t.date}</td>
                      <td className="font-bold text-slate-900">{t.patientName}</td>
                      <td>{t.therapistName}</td>
                      <td><span className="badge badge-blue text-[10px]">{t.type}</span></td>
                      <td>{t.method}</td>
                      <td className="font-bold text-slate-900">{fmt(t.amount)}</td>
                      <td>
                        <span className={
                          t.status === 'PAID' ? 'badge badge-green text-[10px]' :
                          t.status === 'FAILED' ? 'badge badge-red text-[10px]' :
                          t.status === 'EXPIRED' ? 'badge badge-amber text-[10px]' :
                          t.status === 'REFUNDED' ? 'badge badge-purple text-[10px]' :
                          'badge badge-slate text-[10px]'
                        }>
                          ● {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'Invoices' ? (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Invoices Directory</h3>
          {invoices.length > 0 ? (
            <table className="tbl w-full text-xs">
              <thead>
                <tr>
                  <th>INVOICE #</th>
                  <th>PATIENT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id}>
                    <td className="font-mono font-bold">#{inv._id?.slice(-6)?.toUpperCase()}</td>
                    <td>{inv.patientName || 'Patient'}</td>
                    <td className="font-bold">{fmt(inv.amount)}</td>
                    <td><span className="badge badge-blue text-[10px]">● {inv.status || 'ISSUED'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No invoices created yet.</p>
          )}
        </div>
      ) : activeTab === 'Payouts' ? (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Clinician Payout Settlements</h3>
          {payouts.length > 0 ? (
            <table className="tbl w-full text-xs">
              <thead>
                <tr>
                  <th>SPECIALIST</th>
                  <th>SESSIONS</th>
                  <th>PAYOUT AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(po => (
                  <tr key={po._id}>
                    <td className="font-bold">{po.therapistName || 'Specialist'}</td>
                    <td>{po.sessionsCount || 0}</td>
                    <td className="font-bold">{fmt(po.amount)}</td>
                    <td><span className="badge badge-green text-[10px]">● {po.status || 'SETTLED'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">All therapist payouts are up to date.</p>
          )}
        </div>
      ) : (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Refund Requests</h3>
          {refunds.length > 0 ? (
            <table className="tbl w-full text-xs">
              <thead>
                <tr>
                  <th>PATIENT</th>
                  <th>REASON</th>
                  <th>AMOUNT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map(rf => (
                  <tr key={rf._id}>
                    <td className="font-bold">{rf.patientName || 'Patient'}</td>
                    <td>{rf.reason || 'Session Cancellation'}</td>
                    <td className="font-bold">{fmt(rf.amount)}</td>
                    <td>
                      <button
                        onClick={() => handleApproveRefund(rf._id)}
                        className="btn btn-secondary text-[10px] py-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                      >
                        Approve Refund
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No pending refund requests.</p>
          )}
        </div>
      )}

      {/* ── CREATE INVOICE MODAL ── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Create Clinical Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
                <select
                  value={invPatientId}
                  onChange={e => setInvPatientId(e.target.value)}
                  className="select w-full text-xs"
                  required
                >
                  <option value="">Choose Patient...</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.phoneNumber || 'Patient'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Description</label>
                <input
                  value={invService}
                  onChange={e => setInvService(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (₹ INR) *</label>
                <input
                  type="number"
                  value={invAmount}
                  onChange={e => setInvAmount(e.target.value)}
                  className="input text-xs"
                  min="1"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={invSubmitting} className="btn btn-primary text-xs">
                  {invSubmitting ? 'Generating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
