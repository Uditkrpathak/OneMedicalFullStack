import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Phone, Mail, Calendar, Activity, FileText, TrendingUp,
  Edit, Download, CheckCircle, Clock, AlertCircle, Plus,
  CreditCard, Target, Star, ChevronRight, ChevronDown, Users, Check,
  DollarSign, Search, ShieldCheck, Globe, UserPlus, X, RefreshCw,
  Building, MapPin, Trash2
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner } from '../../components/ui.jsx';
import {
  validateName,
  validatePhone,
  validateEmail,
  validateFee,
  validateExperience,
  normalizePhoneNumber
} from '../../utils/validation.js';

const TABS = ['Profile', 'Availability & Schedule', 'Assigned Patients', 'Revenue & Sessions', 'Patient Reviews'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PRESET_AVATARS = [
  { label: 'Specialist 1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80' },
  { label: 'Specialist 2', url: 'https://images.unsplash.com/photo-1594824813501-48e02d627c2e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Specialist 3', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80' },
  { label: 'Specialist 4', url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80' },
];

export default function TherapistDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useSelector(s => s.auth?.accessToken);
  const editFileInputRef = React.useRef(null);

  const [activeTab, setActiveTab] = useState('Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [therapist, setTherapist] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsStats, setReviewsStats] = useState({ averageRating: 5.0, reviewCount: 0 });
  const [stats, setStats] = useState({ totalRevenue: 0, completedSessions: 0 });

  // Modals & form state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [editForm, setEditForm] = useState({
    name: '',
    specialization: '',
    experienceYears: 5,
    phone: '',
    email: '',
    profileImageUrl: '',
  });

  const showToastMsg = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const tRes = await api.getTherapist(token, id);
      if (!tRes?.data) {
        throw new Error('Failed to load therapist profile.');
      }

      const t = tRes.data;
      const effectiveUserId = (t.userId?._id || t.userId || t.user?._id || t._id || id).toString();
      const effectiveProfileId = (t._id || id).toString();

      const name = t.name || t.user?.name || 'Dr. Specialist';
      const quals = t.qualifications?.join(', ') || 'BPT, MPT';
      const exp = t.experienceYears || 0;
      const rawFee = t.consultationFee || 75000;
      const feeInRupees = rawFee >= 5000 ? Math.round(rawFee / 100) : rawFee;
      const img = t.profileImageUrl || t.avatarUrl || t.avatar || t.userId?.profileImageUrl || t.userId?.avatarUrl || t.user?.profileImageUrl || t.user?.avatarUrl || null;
      const rawPhone = t.phoneNumber || t.phone || t.userId?.phoneNumber || t.userId?.phone || t.user?.phoneNumber || t.user?.phone || '—';
      const rawEmail = t.email || t.userId?.email || t.user?.email || '—';

      const tObj = {
        _id: effectiveProfileId,
        id: effectiveProfileId,
        userId: effectiveUserId,
        name,
        title: `${quals} • ${exp} Years Exp`,
        qualifications: t.qualifications || ['BPT', 'MPT'],
        experienceYears: exp,
        specialization: t.specializations?.[0] || 'Physical Therapy & Rehab',
        specializations: t.specializations || ['Physiotherapy'],
        rating: t.ratingAvg !== undefined && t.ratingAvg !== null ? t.ratingAvg : null,
        ratingCount: t.ratingCount || 0,
        languages: t.languages?.join(', ') || 'English, Hindi',
        status: (t.verificationStatus === 'verified' || t.isVerified) ? 'Active' : 'Pending Verification',
        verificationStatus: t.verificationStatus || (t.isVerified ? 'verified' : 'pending'),
        isVerified: t.verificationStatus === 'verified' || t.isVerified === true,
        avatar: img,
        phone: rawPhone,
        email: rawEmail,
        bio: t.bio || 'Experienced Rehabilitation and Movement Specialist.',
        clinicName: t.clinicName || 'One Medical Main Clinic',
        consultationFee: feeInRupees,
      };
      setTherapist(tObj);
      setEditForm({
        name: tObj.name,
        phone: tObj.phone === '—' ? '' : tObj.phone,
        email: tObj.email === '—' ? '' : tObj.email,
        specializations: tObj.specializations?.join(', ') || tObj.specialization,
        qualifications: tObj.qualifications?.join(', ') || 'BPT, MPT',
        experienceYears: exp,
        consultationFee: feeInRupees,
        languages: tObj.languages,
        clinicName: tObj.clinicName,
        bio: tObj.bio,
        verificationStatus: tObj.verificationStatus,
        profileImageUrl: img || '',
      });

      // Load schedule, appointments and stats
      const [schedRes, apptRes, statsRes] = await Promise.allSettled([
        api.getTherapistSchedule(token, effectiveProfileId),
        api.listAppointments(token, { therapistId: effectiveUserId }),
        api.getTherapistStats(token),
      ]);

      if (schedRes.status === 'fulfilled' && schedRes.value?.data) {
        setSchedule(schedRes.value.data);
      }

      let apptsList = [];
      if (apptRes.status === 'fulfilled' && apptRes.value?.data) {
        apptsList = apptRes.value.data.appointments || apptRes.value.data || [];
        setSessions(apptsList);
        const pMap = {};
        apptsList.forEach((a) => {
          const pId = a.patientId?.toString();
          if (pId) {
            pMap[pId] = a.patientName || a.patient?.name || 'Patient';
          }
        });
        const assignedList = Object.entries(pMap).map(([pId, pName]) => ({ id: pId, name: pName }));
        setAssignedPatients(assignedList);
      }

      let totalRev = 0;
      let compCount = 0;
      const validRevenueStatuses = ['COMPLETED', 'DOCUMENTED', 'CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN'];
      const nonActiveStatuses = ['CANCELLED', 'REJECTED', 'RESCHEDULED', 'EXPIRED', 'PAYMENT_EXPIRED'];
      const PAID_STATUSES = ['PAID', 'SETTLED'];

      apptsList.forEach((a) => {
        const isInactive = nonActiveStatuses.includes(a.status);
        const isRefunded = a.paymentStatus === 'REFUNDED';
        const isPaid = PAID_STATUSES.includes(String(a.paymentStatus || '').toUpperCase());

        if (!isInactive && !isRefunded) {
          if (validRevenueStatuses.includes(a.status)) {
            compCount++;
            if (isPaid) {
              const amt = a.paidAmount || a.amount || 0;
              totalRev += amt >= 5000 ? Math.round(amt / 100) : amt;
            }
          }
        }
      });

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        const tStat = statsRes.value.data.find(
          (s) => s.therapistId === effectiveProfileId || s.therapistId === effectiveUserId
        );
        if (tStat && tStat.revenue > 0) {
          totalRev = tStat.revenue;
          compCount = tStat.sessions || compCount;
        }
      }

      setStats({
        totalRevenue: totalRev,
        completedSessions: compCount || apptsList.length,
      });

      // Load verified doctor reviews
      try {
        const revRes = await api.getTherapistReviews(token, id);
        if (revRes?.success && revRes.data) {
          setReviews(revRes.data.reviews || []);
          setReviewsStats({
            averageRating: revRes.data.averageRating || 5.0,
            reviewCount: revRes.data.reviewCount || 0,
          });
        }
      } catch (e) {}

    } catch (err) {
      console.error('Failed to load therapist details:', err);
      setError(err.message || 'Failed to load specialist profile.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [editErrors, setEditErrors] = useState({});

  const handleEditImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditForm(p => ({ ...p, profileImageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditProfileSubmit = async e => {
    e.preventDefault();
    const errs = {};

    const nameErr = validateName(editForm.name, 'Full Name');
    if (nameErr) errs.name = nameErr;

    const phoneErr = validatePhone(editForm.phone, true);
    if (phoneErr) errs.phone = phoneErr;

    const emailErr = validateEmail(editForm.email, false);
    if (emailErr) errs.email = emailErr;

    const feeErr = validateFee(editForm.consultationFee, true);
    if (feeErr) errs.consultationFee = feeErr;

    const expErr = validateExperience(editForm.experienceYears, false);
    if (expErr) errs.experienceYears = expErr;

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});

    setSubmitting(true);
    try {
      const targetId = therapist?.userId || therapist?._id || id;
      const cleanPhone = normalizePhoneNumber(editForm.phone);
      const feeRupees = Number(editForm.consultationFee);
      const feePaise = feeRupees * 100;

      await api.updateTherapist(token, targetId, {
        name: editForm.name.trim(),
        phoneNumber: cleanPhone,
        email: editForm.email ? editForm.email.trim().toLowerCase() : undefined,
        profileImageUrl: editForm.profileImageUrl || undefined,
        specializations: editForm.specializations,
        qualifications: editForm.qualifications,
        experienceYears: Number(editForm.experienceYears),
        consultationFee: feePaise,
        languages: editForm.languages,
        clinicName: editForm.clinicName?.trim(),
        bio: editForm.bio?.trim(),
        verificationStatus: editForm.verificationStatus,
        isVerified: editForm.verificationStatus === 'verified',
      });
      showToastMsg('Specialist profile updated successfully!');
      setIsEditProfileOpen(false);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update therapist profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyTherapist = async (newStatus) => {
    const targetId = therapist?._id || id;
    setSubmitting(true);
    try {
      await api.verifyTherapist(token, targetId, {
        status: newStatus,
        verificationNotes: newStatus === 'verified' ? 'Medical council registration and qualifications verified by Clinic Administrator.' : 'Verification rejected by Clinic Administrator.',
        rejectionReason: newStatus === 'rejected' ? 'Application rejected by Clinic Administrator.' : undefined,
      });
      showToastMsg(`Specialist status updated to ${newStatus.toUpperCase()} successfully!`);
      await loadData();
    } catch (err) {
      console.error('Verify error:', err);
      alert(err.message || 'Failed to update verification status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTherapist = async () => {
    if (!window.confirm(`Are you sure you want to delete / deactivate ${therapist?.name}? This practitioner will be removed from bookings.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const targetId = therapist?.userId || therapist?._id || id;
      await api.deleteTherapist(token, targetId);
      showToastMsg('Specialist deactivated and removed successfully.');
      setTimeout(() => {
        navigate('/therapists');
      }, 700);
    } catch (err) {
      console.error('Delete therapist error:', err);
      alert(err.message || 'Failed to delete therapist profile.');
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-800">Failed to Load Therapist Profile</h2>
        <p className="text-xs text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const weeklyScheduleList = schedule?.weeklyAvailability || schedule?.weeklyWorkingHours || [];
  const isPending = therapist?.verificationStatus === 'pending' || therapist?.verificationStatus === 'under_review' || (!therapist?.isVerified && therapist?.verificationStatus !== 'rejected');

  return (
    <div className="max-w-[1280px] animate-fade-up space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <Check size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button onClick={() => navigate('/therapists')} className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Therapists
        </button>
        <span>/</span>
        <span className="text-slate-900 font-bold">{therapist?.name}</span>
      </div>

      {/* ── VERIFICATION STATUS BANNER ── */}
      {isPending && (
        <div className="card p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>Verification Pending Review</span>
                <span className="badge bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                  {therapist?.verificationStatus || 'PENDING'}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                This practitioner is currently hidden from patient bookings until verified by Clinic Admin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVerifyTherapist('verified')}
              disabled={submitting}
              className="btn btn-primary text-xs font-bold py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle size={14} /> Approve Specialist
            </button>
            <button
              onClick={() => handleVerifyTherapist('rejected')}
              disabled={submitting}
              className="btn btn-secondary text-xs font-bold py-2 px-4 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-1.5"
            >
              <X size={14} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* ── 1. HEADER PROFILE CARD ── */}
      <div className="card p-6 shadow-sm border border-slate-200/80 bg-white rounded-2xl flex flex-wrap justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-2xl flex items-center justify-center border-2 border-slate-100 shadow-sm shrink-0 overflow-hidden">
            {therapist?.avatar ? (
              <img src={therapist.avatar} alt={therapist.name} className="w-full h-full object-cover" />
            ) : (
              therapist?.name?.replace('Dr. ', '')[0] || 'D'
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{therapist?.name}</h1>
              {therapist?.rating !== null && therapist?.rating !== undefined && (
                <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5">
                  ★ {therapist.rating} ({therapist.ratingCount || 0} reviews)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-semibold">{therapist?.title}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Phone size={12} /> {therapist?.phone}</span>
              <span className="flex items-center gap-1"><Mail size={12} /> {therapist?.email}</span>
            </div>

            <div className="flex items-center gap-2 pt-1.5 flex-wrap">
              {therapist?.specializations?.map((s, idx) => (
                <span key={idx} className="badge bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                  {s}
                </span>
              ))}
              <span className={`badge text-[10px] font-bold ${therapist?.verificationStatus === 'verified' || therapist?.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                ● {therapist?.verificationStatus?.toUpperCase() || (therapist?.isVerified ? 'VERIFIED' : 'PENDING')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="btn btn-secondary text-xs font-bold py-2.5 px-4 bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 rounded-xl"
          >
            <Edit size={14} /> Edit Profile
          </button>
          <button
            onClick={() => handleDeleteTherapist()}
            disabled={submitting}
            className="btn btn-secondary text-xs font-bold py-2.5 px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 rounded-xl"
          >
            <Trash2 size={14} /> Delete Specialist
          </button>
        </div>
      </div>

      {/* ── 2. QUICK STATS ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Patients</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{assignedPatients.length}</div>
        </div>
        <div className="card p-4 bg-white border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultations</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{sessions.length}</div>
        </div>
        <div className="card p-4 bg-white border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">₹{therapist?.consultationFee?.toLocaleString('en-IN')}</div>
        </div>
        <div className="card p-4 bg-white border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Earned</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* ── 3. TABS NAVIGATION ── */}
      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-1 text-xs">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 rounded-xl font-bold transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── 4. TAB CONTENTS ── */}

      {/* TAB 1: PROFILE & BIO */}
      {activeTab === 'Profile' && (
        <div className="space-y-4">
          <div className="card p-6 bg-white border border-slate-200 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Clinician Biography & Specialization</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {therapist?.bio}
            </p>
          </div>

          <div className="card p-6 bg-white border border-slate-200 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Professional Qualifications & Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Degree & University</div>
                <div className="font-bold text-slate-800 mt-1">{therapist?.title}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Clinical Languages</div>
                <div className="font-bold text-slate-800 mt-1">{therapist?.languages}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Practice Clinic</div>
                <div className="font-bold text-slate-800 mt-1">{therapist?.clinicName}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE WEEKLY SCHEDULE */}
      {activeTab === 'Availability & Schedule' && (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Weekly Working Hours & Slot Timing</h3>
            <span className="text-xs text-slate-400 font-semibold">Slot Buffer: {schedule?.appointmentBufferMinutes || 10} min</span>
          </div>

          {weeklyScheduleList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {weeklyScheduleList.map((day, idx) => {
                const dayName = DAY_NAMES[day.dayOfWeek] || `Day ${day.dayOfWeek}`;
                const isWorking = day.isWorking !== false;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                      isWorking ? 'bg-slate-50/80 border-slate-200/80' : 'bg-slate-100/60 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{dayName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {isWorking ? `${day.startTime || '09:00'} – ${day.endTime || '18:00'}` : 'Off Day / Clinic Closed'}
                      </div>
                    </div>

                    <span className={`badge text-[10px] font-bold ${isWorking ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {isWorking ? `${day.slotDurationMinutes || 30}m Slot` : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Working Days:</span>
                <span className="font-bold text-slate-800">Monday – Saturday</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Working Hours:</span>
                <span className="font-bold text-slate-800">09:00 AM – 06:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Slot Interval:</span>
                <span className="font-bold text-slate-800">30 Minutes</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNED PATIENTS */}
      {activeTab === 'Assigned Patients' && (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Assigned Patient Roster</h3>
          {assignedPatients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignedPatients.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="p-4 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.condition}</div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No patients currently assigned.</p>
          )}
        </div>
      )}

      {/* TAB 4: COMPLETED SESSIONS & REVENUE */}
      {activeTab === 'Revenue & Sessions' && (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Consultation Sessions & Settle History</h3>
          {sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="tbl w-full text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4 text-left">APPOINTMENT ID</th>
                    <th className="py-3 px-4 text-left">DATE & TIME</th>
                    <th className="py-3 px-4 text-left">PATIENT</th>
                    <th className="py-3 px-4 text-left">SERVICE TYPE</th>
                    <th className="py-3 px-4 text-left">FEE</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map(s => {
                    const feeVal = s.amount ? (s.amount >= 5000 ? Math.round(s.amount / 100) : s.amount) : therapist?.consultationFee;
                    const d = s.startTime ? new Date(s.startTime) : new Date();

                    return (
                      <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">#{s._id?.slice(-6)?.toUpperCase()}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} · {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.patientName || 'Patient'}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{s.serviceType?.replace(/_/g, ' ') || 'Physiotherapy'}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">₹{feeVal?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge text-[10px] font-bold ${s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                            ● {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No session records found.</p>
          )}
        </div>
      )}

      {/* TAB 5: PATIENT REVIEWS & RATINGS */}
      {activeTab === 'Patient Reviews' && (
        <div className="card p-6 bg-white border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Verified Patient Reviews</h3>
              <p className="text-xs text-slate-400">Authentic feedback from completed clinical consultations</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">{reviewsStats.averageRating?.toFixed(1) || '5.0'}</span>
              <div className="text-xs text-amber-500 font-bold">★ ★ ★ ★ ★</div>
              <span className="text-xs text-slate-400 font-semibold">({reviewsStats.reviewCount || reviews.length} reviews)</span>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r._id || r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {r.patientName?.[0] || 'P'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{r.patientName || 'Verified Patient'}</div>
                        <div className="text-[10px] text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : 'Recent'}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-extrabold">
                      {r.rating} ★
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">"{r.comment || r.reviewText}"</p>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {r.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No patient reviews submitted yet for this specialist.</p>
          )}
        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit Practitioner Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update practitioner credentials, fees, contact details and verification status.</p>
              </div>
              <button onClick={() => setIsEditProfileOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="space-y-4 text-xs">
              
              {/* ── PHOTO UPLOAD & PRESET SELECTOR ── */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="block font-black text-slate-800 uppercase tracking-wider text-[10px]">
                  Practitioner Profile Portrait
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 border-2 border-blue-600/30 shadow-xs flex items-center justify-center">
                      {editForm.profileImageUrl ? (
                        <img src={editForm.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-slate-500">
                          {editForm.name ? editForm.name.charAt(0) : 'D'}
                        </span>
                      )}
                    </div>
                    {editForm.profileImageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, profileImageUrl: '' }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleEditImageFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="btn btn-primary text-xs font-bold py-1.5 px-3 bg-[#003882] hover:bg-[#002b66] text-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Upload from device (PNG, JPG, WebP) or choose a preset headshot below.
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Presets:
                  </span>
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditForm(p => ({ ...p, profileImageUrl: av.url }))}
                      className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        editForm.profileImageUrl === av.url ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Full Name *</span>
                    {editErrors.name && <span className="text-rose-600 font-semibold">{editErrors.name}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.name ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    value={editForm.name || ''}
                    onChange={e => {
                      setEditForm(p => ({ ...p, name: e.target.value }));
                      if (editErrors.name) setEditErrors(p => ({ ...p, name: null }));
                    }}
                    placeholder="e.g. Dr. Vivek Joshi"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Phone Number *</span>
                    {editErrors.phone && <span className="text-rose-600 font-semibold">{editErrors.phone}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.phone ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    value={editForm.phone || ''}
                    onChange={e => {
                      setEditForm(p => ({ ...p, phone: e.target.value }));
                      if (editErrors.phone) setEditErrors(p => ({ ...p, phone: null }));
                    }}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Email Address</span>
                    {editErrors.email && <span className="text-rose-600 font-semibold">{editErrors.email}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.email ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    type="email"
                    value={editForm.email || ''}
                    onChange={e => {
                      setEditForm(p => ({ ...p, email: e.target.value }));
                      if (editErrors.email) setEditErrors(p => ({ ...p, email: null }));
                    }}
                    placeholder="doctor@onemedical.com"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qualifications / Degrees</label>
                  <input
                    className="input"
                    value={editForm.qualifications || ''}
                    onChange={e => setEditForm(p => ({ ...p, qualifications: e.target.value }))}
                    placeholder="e.g. MPT - Orthopedics, BPT"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specializations (comma separated)</label>
                  <input
                    className="input"
                    value={editForm.specializations || ''}
                    onChange={e => setEditForm(p => ({ ...p, specializations: e.target.value }))}
                    placeholder="e.g. Orthopedic Physiotherapy, Sports Rehab"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Experience (Years)</span>
                    {editErrors.experienceYears && <span className="text-rose-600 font-semibold">{editErrors.experienceYears}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.experienceYears ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    type="number"
                    value={editForm.experienceYears || 0}
                    onChange={e => {
                      setEditForm(p => ({ ...p, experienceYears: e.target.value }));
                      if (editErrors.experienceYears) setEditErrors(p => ({ ...p, experienceYears: null }));
                    }}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Consultation Fee (₹) *</span>
                    {editErrors.consultationFee && <span className="text-rose-600 font-semibold">{editErrors.consultationFee}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.consultationFee ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    type="number"
                    value={editForm.consultationFee || 750}
                    onChange={e => {
                      setEditForm(p => ({ ...p, consultationFee: e.target.value }));
                      if (editErrors.consultationFee) setEditErrors(p => ({ ...p, consultationFee: null }));
                    }}
                    min="100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clinical Languages</label>
                  <input
                    className="input"
                    value={editForm.languages || ''}
                    onChange={e => setEditForm(p => ({ ...p, languages: e.target.value }))}
                    placeholder="e.g. English, Hindi"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Practice Clinic / Facility</label>
                  <input
                    className="input"
                    value={editForm.clinicName || ''}
                    onChange={e => setEditForm(p => ({ ...p, clinicName: e.target.value }))}
                    placeholder="e.g. One Medical Main Clinic"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Verification Status</label>
                  <select
                    className="input font-bold"
                    value={editForm.verificationStatus || 'verified'}
                    onChange={e => setEditForm(p => ({ ...p, verificationStatus: e.target.value }))}
                  >
                    <option value="verified">VERIFIED (Active on Patient App)</option>
                    <option value="under_review">UNDER REVIEW</option>
                    <option value="pending">PENDING</option>
                    <option value="suspended">SUSPENDED</option>
                    <option value="rejected">REJECTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Biography & Profile Summary</label>
                <textarea
                  className="input min-h-[90px] py-2 leading-relaxed"
                  value={editForm.bio || ''}
                  onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Clinical bio, specialties, patient care philosophy..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="btn btn-secondary text-xs font-bold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary text-xs font-bold px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
