import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice.js';

// SVG icons matching the screenshot style
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/patients',
    label: "Patient's",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    to: '/therapists',
    label: 'Therapists',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.56 2.9A7 7 0 1 1 3 12.4"/><path d="m2 2 20 20"/><path d="M9 9a3 3 0 1 0 3.26 4.85"/>
        <path d="M12 8h.01"/>
      </svg>
    ),
  },
  {
    to: '/appointments',
    label: 'Schedule',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    to: '/chat',
    label: 'Live Consultations',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    to: '/programs',
    label: 'Programs',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    to: '/exercises',
    label: 'Exercise Library',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/>
        <path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/>
        <path d="m14 21 7-7"/>
      </svg>
    ),
  },
  {
    to: '/payments',
    label: 'Billing',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    to: '/reviews',
    label: 'Doctor Reviews',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    to: '/records',
    label: 'Notifications',
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
];

const bottomItems = [
  {
    to: '/settings',
    label: 'Settings',
    icon: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    to: '/support',
    label: 'Support',
    icon: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
];

export default function Sidebar({ mobileOpen = false, onClose }) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const user      = useSelector(s => s.auth.user);

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 w-[220px] h-screen bg-white border-r border-slate-100 flex flex-col z-50 overflow-y-auto shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ── LOGO ── */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #f1f5f9' }} className="flex items-center justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.png"
              alt="One Medical Logo"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                objectFit: 'cover',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.2px' }}>One Medical</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 1 }}>Clinic Admin</div>
            </div>
          </div>

          {/* Close button for mobile */}
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── NAV ITEMS ── */}
        <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, label, icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => onClose && onClose()}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#1d4ed8' : '#64748b',
                background: isActive ? '#eff6ff' : 'transparent',
                transition: 'all 0.12s ease',
                position: 'relative',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.style.background.includes('eff6ff')) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#334155';
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.style.background.includes('eff6ff')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <NavIcon />
                  <span>{label}</span>
                  {isActive && (
                    <span style={{
                      width: 4,
                      height: 18,
                      borderRadius: 99,
                      background: '#2563eb',
                      marginLeft: 'auto',
                    }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── BOTTOM LINKS ── */}
        <div style={{ padding: '8px 10px', borderTop: '1px solid #f1f5f9' }}>
          {bottomItems.map(({ to, label, icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose && onClose()}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 9, textDecoration: 'none',
                fontSize: 13, fontWeight: 400, color: isActive ? '#2563eb' : '#64748b',
                background: isActive ? '#eff6ff' : 'transparent',
                marginBottom: 2, transition: 'all 0.12s',
              })}
            >
              <NavIcon />
              {label}
            </NavLink>
          ))}

          {/* Logout */}
          <button
            onClick={() => {
              if (onClose) onClose();
              dispatch(logout());
              navigate('/login');
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9,
              width: '100%', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: '#ef4444',
              background: 'transparent', textAlign: 'left',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

