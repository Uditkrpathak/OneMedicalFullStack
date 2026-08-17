import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import AdminLayout from './components/AdminLayout.jsx';
import PermissionGuard from './components/PermissionGuard.jsx';

// ─── DOMAIN PAGE IMPORTS ───
import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';

import PatientsPage from './pages/patients/PatientsPage.jsx';
import AddPatientPage from './pages/patients/AddPatientPage.jsx';
import PatientDetailPage from './pages/patients/PatientDetailPage.jsx';

import TherapistsPage from './pages/therapists/TherapistsPage.jsx';
import AddTherapistPage from './pages/therapists/AddTherapistPage.jsx';
import TherapistDetailPage from './pages/therapists/TherapistDetailPage.jsx';

import AppointmentsPage from './pages/appointments/AppointmentsPage.jsx';
import CreateAppointmentPage from './pages/appointments/CreateAppointmentPage.jsx';
import AppointmentDetailsPage from './pages/appointments/AppointmentDetailsPage.jsx';
import RescheduleAppointmentPage from './pages/appointments/RescheduleAppointmentPage.jsx';
import SessionSummaryPage from './pages/appointments/SessionSummaryPage.jsx';
import NotificationsPage from './pages/notifications/NotificationsPage.jsx';

import ProgramsPage from './pages/programs/ProgramsPage.jsx';
import CreateProgramPage from './pages/programs/CreateProgramPage.jsx';
import ProgramOverviewPage from './pages/programs/ProgramOverviewPage.jsx';

import ExercisesPage from './pages/exercises/ExercisesPage.jsx';
import CreateExercisePage from './pages/exercises/CreateExercisePage.jsx';

import PaymentsPage from './pages/payments/PaymentsPage.jsx';
import AnalyticsPage from './pages/analytics/AnalyticsPage.jsx';
import MedicalRecordsPage from './pages/records/MedicalRecordsPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import AdminChatPage from './pages/chat/AdminChatPage.jsx';
import AdminTelehealthRoom from './pages/telehealth/AdminTelehealthRoom.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import SupportPage from './pages/support/SupportPage.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

const ADMIN_ROLES = ['admin', 'clinic_admin', 'super_admin', 'therapist', 'doctor'];

function ProtectedPage({ children, roles = ADMIN_ROLES }) {
  return (
    <PermissionGuard allowedRoles={roles}>
      <AdminLayout>{children}</AdminLayout>
    </PermissionGuard>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/"             element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
            <Route path="/chat"         element={<ProtectedPage><AdminChatPage /></ProtectedPage>} />
            <Route path="/telehealth"   element={<ProtectedPage><AdminTelehealthRoom /></ProtectedPage>} />
            <Route path="/telehealth/:callId" element={<ProtectedPage><AdminTelehealthRoom /></ProtectedPage>} />
            <Route path="/analytics"    element={<ProtectedPage roles={ADMIN_ROLES}><AnalyticsPage /></ProtectedPage>} />
            <Route path="/records"      element={<ProtectedPage><MedicalRecordsPage /></ProtectedPage>} />
            <Route path="/users"        element={<ProtectedPage roles={ADMIN_ROLES}><UsersPage /></ProtectedPage>} />
            <Route path="/patients"     element={<ProtectedPage><PatientsPage /></ProtectedPage>} />
            <Route path="/patients/add" element={<ProtectedPage><AddPatientPage /></ProtectedPage>} />
            <Route path="/patients/:id" element={<ProtectedPage><PatientDetailPage /></ProtectedPage>} />
            <Route path="/therapists"   element={<ProtectedPage roles={ADMIN_ROLES}><TherapistsPage /></ProtectedPage>} />
            <Route path="/therapists/add" element={<ProtectedPage roles={ADMIN_ROLES}><AddTherapistPage /></ProtectedPage>} />
            <Route path="/therapists/:id" element={<ProtectedPage roles={ADMIN_ROLES}><TherapistDetailPage /></ProtectedPage>} />
            <Route path="/appointments" element={<ProtectedPage><AppointmentsPage /></ProtectedPage>} />
            <Route path="/appointments/create" element={<ProtectedPage><CreateAppointmentPage /></ProtectedPage>} />
            <Route path="/appointments/:id" element={<ProtectedPage><AppointmentDetailsPage /></ProtectedPage>} />
            <Route path="/appointments/:id/reschedule" element={<ProtectedPage><RescheduleAppointmentPage /></ProtectedPage>} />
            <Route path="/appointments/:id/session" element={<ProtectedPage><SessionSummaryPage /></ProtectedPage>} />
            <Route path="/notifications" element={<ProtectedPage><NotificationsPage /></ProtectedPage>} />
            <Route path="/exercises"    element={<ProtectedPage><ExercisesPage /></ProtectedPage>} />
            <Route path="/exercises/create" element={<ProtectedPage><CreateExercisePage /></ProtectedPage>} />
            <Route path="/programs"     element={<ProtectedPage><ProgramsPage /></ProtectedPage>} />
            <Route path="/programs/create" element={<ProtectedPage><CreateProgramPage /></ProtectedPage>} />
            <Route path="/programs/:id" element={<ProtectedPage><ProgramOverviewPage /></ProtectedPage>} />
            <Route path="/payments"     element={<ProtectedPage roles={ADMIN_ROLES}><PaymentsPage /></ProtectedPage>} />
            <Route path="/settings"     element={<ProtectedPage roles={ADMIN_ROLES}><SettingsPage /></ProtectedPage>} />
            <Route path="/support"      element={<ProtectedPage><SupportPage /></ProtectedPage>} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </BrowserRouter>
    </Provider>
  );
}
