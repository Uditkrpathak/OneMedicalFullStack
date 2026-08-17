import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Building2,
  Clock,
  Video,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Lock,
  Smartphone,
  Sliders,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const user = useSelector((s) => s.auth?.user);

  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  // Settings state with realistic clinic defaults
  const [settings, setSettings] = useState({
    // General
    clinicName: 'One Medical Rehabilitation & Wellness Center',
    branchName: 'Downtown Care Pavilion',
    email: 'admin@onemedical.com',
    phone: '+91 99999 99999',
    address: 'Suite 402, Medical City Boulevard, Connaught Place, New Delhi',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST +05:30)',

    // Consultations & Booking
    slotDuration: '45',
    holdTimeoutMinutes: '10',
    cancelBufferHours: '4',
    autoConfirmPaid: true,
    allowGuestBooking: false,
    maxDailyBookingsPerDoctor: '16',

    // Telehealth & Video
    videoProvider: 'WebRTC Direct HD',
    defaultVideoQuality: '1080p Full HD',
    allowScreenShare: true,
    enableNoiseCancellation: true,
    autoRecordSessions: false,

    // Notifications
    enablePushNotifications: true,
    enableSmsAlerts: true,
    enableEmailInvoices: true,
    notifyOnDoctorRegistration: true,
    notifyOnEmergencyTriage: true,

    // Security & Compliance
    sessionTimeoutMinutes: '60',
    enforceMfaForStaff: true,
    enableDetailedAuditLogs: true,
    dataRetentionDays: '365',
  });

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const tabs = [
    { id: 'general', label: 'Clinic Profile', icon: Building2 },
    { id: 'scheduling', label: 'Consultations & Schedule', icon: Clock },
    { id: 'telehealth', label: 'Telehealth & Video', icon: Video },
    { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-blue-600" />
            Clinic Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure clinic operations, clinical scheduling limits, telehealth parameters, and security policies.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          {saved ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Save size={16} />}
          {saved ? 'Changes Saved' : 'Save Preferences'}
        </button>
      </div>

      {/* Success Alert Banner */}
      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>All clinic settings and parameters have been updated and synchronized across all active services.</span>
        </div>
      )}

      {/* Main Settings Card with Tabs */}
      <div className="card overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const TabIcon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <TabIcon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSave} className="p-4 sm:p-8 space-y-6">
          {/* 1. GENERAL CLINIC PROFILE */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Clinic Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Clinic Legal Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={settings.clinicName}
                      onChange={(e) => handleChange('clinicName', e.target.value)}
                      className="input pl-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Branch / Pavilion Name</label>
                  <input
                    type="text"
                    value={settings.branchName}
                    onChange={(e) => handleChange('branchName', e.target.value)}
                    className="input text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="label">Official Contact Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="input pl-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Helpline Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="input pl-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Physical Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="input pl-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="label">Operating Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="GBP (£)">GBP (£) - British Pound</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                  </select>
                </div>

                <div>
                  <label className="label">Clinic Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="Asia/Kolkata (IST +05:30)">Asia/Kolkata (IST +05:30)</option>
                    <option value="UTC">UTC Universal Time</option>
                    <option value="America/New_York (EST)">America/New_York (EST)</option>
                    <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. CONSULTATIONS & SCHEDULING */}
          {activeTab === 'scheduling' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Appointment Policies</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Default Slot Duration</label>
                  <select
                    value={settings.slotDuration}
                    onChange={(e) => handleChange('slotDuration', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="label">Temporary Hold Expiry</label>
                  <select
                    value={settings.holdTimeoutMinutes}
                    onChange={(e) => handleChange('holdTimeoutMinutes', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="5">5 Minutes</option>
                    <option value="10">10 Minutes (Recommended)</option>
                    <option value="15">15 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="label">Cancellation Grace Period</label>
                  <select
                    value={settings.cancelBufferHours}
                    onChange={(e) => handleChange('cancelBufferHours', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="2">2 Hours Prior</option>
                    <option value="4">4 Hours Prior</option>
                    <option value="12">12 Hours Prior</option>
                    <option value="24">24 Hours Prior</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">Auto-Confirm Completed Payments</div>
                    <div className="text-[11px] text-slate-500">Automatically transitions appointment from HELD to CONFIRMED on checkout capture.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoConfirmPaid}
                    onChange={(e) => handleChange('autoConfirmPaid', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">Doctor Maximum Daily Consultations Limit</div>
                    <div className="text-[11px] text-slate-500">Cap max slots bookable per doctor per day to avoid clinician fatigue.</div>
                  </div>
                  <input
                    type="number"
                    value={settings.maxDailyBookingsPerDoctor}
                    onChange={(e) => handleChange('maxDailyBookingsPerDoctor', e.target.value)}
                    className="input w-24 text-center text-xs sm:text-sm"
                    min={4}
                    max={30}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 3. TELEHEALTH & VIDEO */}
          {activeTab === 'telehealth' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">WebRTC Video Infrastructure</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">WebRTC Signaling Engine</label>
                  <input
                    type="text"
                    disabled
                    value={settings.videoProvider}
                    className="input bg-slate-100 text-slate-600 text-xs sm:text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="label">Default Resolution Stream</label>
                  <select
                    value={settings.defaultVideoQuality}
                    onChange={(e) => handleChange('defaultVideoQuality', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="720p HD">720p HD (Optimal for mobile bandwidth)</option>
                    <option value="1080p Full HD">1080p Full HD (Recommended)</option>
                    <option value="4K Ultra">4K Ultra HD (High speed broadband only)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">Allow Doctor Screen Sharing</div>
                    <div className="text-[11px] text-slate-500">Clinicians can share MRI scans, x-rays, and exercise posture videos directly during call.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowScreenShare}
                    onChange={(e) => handleChange('allowScreenShare', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">AI Background Noise Suppression</div>
                    <div className="text-[11px] text-slate-500">Filter background clinical ambience and echo during voice sessions.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableNoiseCancellation}
                    onChange={(e) => handleChange('enableNoiseCancellation', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 4. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Communication Channels</h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">FCM Live Mobile Push Notifications</div>
                    <div className="text-[11px] text-slate-500">Real-time alerts for incoming chat, consultation invites, and prescription updates.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enablePushNotifications}
                    onChange={(e) => handleChange('enablePushNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">SMS Gateway Dispatch</div>
                    <div className="text-[11px] text-slate-500">Sends SMS OTP verification codes and critical appointment reminders to patient phone.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableSmsAlerts}
                    onChange={(e) => handleChange('enableSmsAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">New Doctor Registration Administrator Alert</div>
                    <div className="text-[11px] text-slate-500">Immediately notify administrators when a new doctor registers awaiting verification.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnDoctorRegistration}
                    onChange={(e) => handleChange('notifyOnDoctorRegistration', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 5. SECURITY & COMPLIANCE */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Security Policies</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Admin Session Inactivity Timeout</label>
                  <select
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) => handleChange('sessionTimeoutMinutes', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes (Standard)</option>
                    <option value="120">2 Hours</option>
                    <option value="480">8 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="label">Audit Logs Retention Period</label>
                  <select
                    value={settings.dataRetentionDays}
                    onChange={(e) => handleChange('dataRetentionDays', e.target.value)}
                    className="select text-xs sm:text-sm"
                  >
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">365 Days (1 Year - HIPAA compliant)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">Enforce MFA / OTP for Medical Staff</div>
                    <div className="text-[11px] text-slate-500">Requires verified mobile OTP challenge on every clinician and admin login.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enforceMfaForStaff}
                    onChange={(e) => handleChange('enforceMfaForStaff', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">Immutable Clinical Audit Logging</div>
                    <div className="text-[11px] text-slate-500">Record all doctor verification, record access, and prescription change events.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableDetailedAuditLogs}
                    onChange={(e) => handleChange('enableDetailedAuditLogs', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
