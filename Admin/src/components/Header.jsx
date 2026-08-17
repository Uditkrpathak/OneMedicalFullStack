import { useState, useEffect, useRef } from 'react';
import { Search, Bell, HelpCircle, Menu, User, Stethoscope, MessageSquare, ArrowRight, X, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from './ui.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Header({ onToggleMobileSidebar }) {
  const user = useSelector(s => s.auth?.user);
  const token = useSelector(s => s.auth?.accessToken) || localStorage.getItem('token');
  const navigate = useNavigate();

  const userName = user?.name || 'Clinic Administrator';
  const userRole = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'CLINIC ADMIN';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ patients: [], therapists: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults({ patients: [], therapists: [] });
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setIsOpen(true);
      try {
        const [patRes, therRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/patients?search=${encodeURIComponent(query)}&limit=5`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${API_BASE}/api/v1/therapists?search=${encodeURIComponent(query)}&limit=5`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        const [patJson, therJson] = await Promise.all([
          patRes.ok ? patRes.json() : { data: [] },
          therRes.ok ? therRes.json() : { data: [] },
        ]);

        setResults({
          patients: Array.isArray(patJson?.data) ? patJson.data : [],
          therapists: Array.isArray(therJson?.data) ? therJson.data : [],
        });
      } catch (err) {
        console.error('[HeaderSearch] Error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token]);

  const handleSelectPatient = (patient) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/patients`);
  };

  const handleSelectTherapist = (therapist) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/therapists`);
  };

  const handleOpenChat = (e, person) => {
    e.stopPropagation();
    setIsOpen(false);
    setQuery('');
    navigate(`/chat`, {
      state: {
        autoOpenUserId: person._id || person.userId,
        autoOpenName: person.name,
        autoOpenRole: person.role || (person.specializations ? 'therapist' : 'patient')
      }
    });
  };

  const totalResults = results.patients.length + results.therapists.length;

  return (
    <header className="h-16 border-b border-slate-100 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs gap-2">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg" ref={dropdownRef}>
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Search Input Container */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patients, doctors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.trim()) setIsOpen(true); }}
            className="w-full pl-9 pr-8 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(''); setIsOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              {loading ? <Loader2 size={13} className="animate-spin text-blue-500" /> : <X size={13} />}
            </button>
          )}

          {/* Live Search Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-fade-in max-h-[420px] overflow-y-auto">
              <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Search results for "{query}"</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {loading ? 'Searching...' : `${totalResults} found`}
                </span>
              </div>

              {loading && totalResults === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  Searching clinic records...
                </div>
              ) : totalResults === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching patients or doctors found for "{query}".
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {/* Patients Section */}
                  {results.patients.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User size={12} className="text-blue-500" /> Patients
                      </div>
                      <div className="space-y-1 mt-1">
                        {results.patients.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => handleSelectPatient(p)}
                            className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {p.name?.charAt(0) || 'P'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                  {p.name || 'Patient'}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {p.phoneNumber || p.email || 'Registered Patient'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => handleOpenChat(e, p)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-[11px] flex items-center gap-1 font-semibold"
                                title="Open Live Consultation"
                              >
                                <MessageSquare size={12} />
                                <span className="hidden sm:inline">Consult</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Therapists Section */}
                  {results.therapists.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Stethoscope size={12} className="text-emerald-500" /> Doctors & Specialists
                      </div>
                      <div className="space-y-1 mt-1">
                        {results.therapists.map((t) => (
                          <div
                            key={t._id || t.userId}
                            onClick={() => handleSelectTherapist(t)}
                            className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {t.name?.charAt(0) || 'D'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                                  {t.name || 'Doctor Specialist'}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {Array.isArray(t.specializations) ? t.specializations.join(', ') : (t.specialization || 'Physiotherapist')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => handleOpenChat(e, t)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-[11px] flex items-center gap-1 font-semibold"
                                title="Open Live Chat"
                              >
                                <MessageSquare size={12} />
                                <span className="hidden sm:inline">Chat</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Bell Icon */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        {/* Help Icon */}
        <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors hidden sm:block">
          <HelpCircle size={18} />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 sm:border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight">{userName}</div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">{userRole}</div>
          </div>
          <UserAvatar
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150"
            name={userName}
            className="w-8 h-8 sm:w-9 sm:h-9"
          />
        </div>
      </div>
    </header>
  );
}
