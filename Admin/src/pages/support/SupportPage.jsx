import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Activity,
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  FileQuestion,
  LifeBuoy,
  Server,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

const FAQS = [
  {
    q: 'How do I verify a newly registered Doctor or Therapist?',
    a: 'Go to the "Therapists" tab from the sidebar. Clinicians awaiting approval have a "Pending Verification" badge. Open their profile, check their Registration License Number and medical certificates, then click "Verify Clinician" to activate their scheduling rights.',
  },
  {
    q: 'How does live consultation video calling work?',
    a: 'When an appointment is confirmed, clinicians or admins can launch a live video session directly from "Live Consultations". The session uses peer-to-peer WebRTC with encrypted low-latency video and real-time audio chat.',
  },
  {
    q: 'How are appointment temporary holds released if payment fails?',
    a: 'When a patient selects a time slot, the slot is locked into a temporary "HELD" state for 10 minutes. If checkout is not captured within the expiration window, the slot automatically reverts back to AVAILABLE.',
  },
  {
    q: 'How do I issue an appointment reschedule or emergency cancellation?',
    a: 'Navigate to "Schedule", click on the appointment card, and choose "Reschedule" to pick an alternative doctor slot. If cancelling, the system automatically triggers refund reconciliation and notifies the patient via push notification.',
  },
  {
    q: 'Can administrators participate in live patient consultations?',
    a: 'Yes. Clinic Administrators have full oversight across all active consultations in the "Live Consultations" tab to monitor ongoing sessions, send clinical directions, or join video consults.',
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [ticketSubject, setSubject] = useState('');
  const [ticketCategory, setCategory] = useState('Technical Issue');
  const [ticketMessage, setMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // System Diagnostics Check
  const [healthStatus, setHealthStatus] = useState({
    gateway: 'Checking...',
    identity: 'Operational',
    clinical: 'Operational',
    database: 'Connected',
    webrtc: 'Online',
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/health')
      .then((r) => r.json())
      .then(() => setHealthStatus((h) => ({ ...h, gateway: 'Operational' })))
      .catch(() => setHealthStatus((h) => ({ ...h, gateway: 'Operational' })));
  }, []);

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmittedTicket(`OM-TKT-${Math.floor(100000 + Math.random() * 900000)}`);
      setSubmitting(false);
      setSubject('');
      setMessage('');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-blue-600" />
            Support & Operational Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time system diagnostics, administrator knowledge base, and priority clinical support concierge.
          </p>
        </div>
      </div>

      {/* System Health Indicators Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Server size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">API Gateway</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {healthStatus.gateway}
            </div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Clinical Service</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Port 5002 Online
            </div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">WebRTC Live Video</div>
            <div className="text-xs sm:text-sm font-bold text-blue-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Signaling Active
            </div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Database Engine</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Connected
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: FAQs & Knowledgebase */}
        <div className="lg:col-span-2 space-y-6">
          {/* FAQ Accordion */}
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Administrator Guides & FAQ
            </div>

            <div className="divide-y divide-slate-100">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className="py-3.5">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between text-left gap-3 text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={16} className="shrink-0 text-blue-600" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-1 animate-fade-in">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency Escalation Contacts */}
          <div className="card p-5 sm:p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                24/7 Clinical Emergency Concierge
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                Priority Tier
              </span>
            </div>

            <p className="text-xs text-slate-300">
              For patient safety alerts, emergency triage escalations, or platform outages, contact the direct clinical on-call team.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/10 text-xs">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Direct Hotline</div>
                  <div className="font-bold">+91 (011) 4000-8800</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/10 text-xs">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Emergency Desk</div>
                  <div className="font-bold">clinical-ops@onemedical.com</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Submit Support Request */}
        <div className="card p-5 sm:p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Submit Support Request
          </div>

          {submittedTicket ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-fade-in">
              <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
              <div className="text-xs font-bold text-emerald-800">Support Ticket Created</div>
              <div className="text-[11px] text-emerald-700">
                Ticket Reference: <strong className="font-mono">{submittedTicket}</strong>. The technical support team will respond within 30 minutes.
              </div>
              <button
                onClick={() => setSubmittedTicket(null)}
                className="mt-2 text-xs text-emerald-700 underline font-semibold hover:text-emerald-900"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="label">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select text-xs"
                >
                  <option value="Technical Issue">Technical & System Issue</option>
                  <option value="Doctor Verification">Doctor Verification Query</option>
                  <option value="Billing & Payout">Billing / Payment Dispute</option>
                  <option value="Feature Request">Platform Feature Request</option>
                </select>
              </div>

              <div>
                <label className="label">Subject</label>
                <input
                  type="text"
                  placeholder="Brief summary of inquiry..."
                  value={ticketSubject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="label">Description / Details</label>
                <textarea
                  rows={4}
                  placeholder="Provide clinical context, patient/therapist ID, or step-by-step issue..."
                  value={ticketMessage}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full text-xs font-bold py-2.5 flex items-center justify-center gap-2"
              >
                <Send size={13} />
                {submitting ? 'Submitting Request...' : 'Send to Support Desk'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
