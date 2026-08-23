import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { restoreSession } from '../../features/auth/authSlice';

// Import Onboarding & Auth Screens
import WelcomeScreen from '../../features/auth/screens/WelcomeScreen';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import SignupScreen from '../../features/auth/screens/SignupScreen';
import OtpScreen from '../../features/auth/screens/OtpScreen';
import CompleteProfileScreen from '../../features/auth/screens/CompleteProfileScreen';
import EnablePermissionsScreen from '../../features/auth/screens/EnablePermissionsScreen';
import SetupCompleteScreen from '../../features/auth/screens/SetupCompleteScreen';

import ProfileSettingsScreen from '../../features/auth/screens/ProfileSettingsScreen';
import PatientProfileOverviewScreen from '../../features/auth/screens/PatientProfileOverviewScreen';
import EditPatientProfileScreen from '../../features/auth/screens/EditPatientProfileScreen';
import MedicalInformationScreen from '../../features/clinical/screens/MedicalInformationScreen';
import MedicalRecordsVaultScreen from '../../features/clinical/screens/MedicalRecordsVaultScreen';

import BookAppointmentScreen from '../../features/appointments/screens/BookAppointmentScreen';
import TherapistDetailScreen from '../../features/appointments/screens/TherapistDetailScreen';
import SelectDateTimeScreen from '../../features/appointments/screens/SelectDateTimeScreen';
import ChoosePaymentScreen from '../../features/appointments/screens/ChoosePaymentScreen';
import PaymentProcessingScreen from '../../features/appointments/screens/PaymentProcessingScreen';
import AppointmentConfirmedScreen from '../../features/appointments/screens/AppointmentConfirmedScreen';
import MyBookingsScreen from '../../features/appointments/screens/MyBookingsScreen';
import AppointmentDetailScreen from '../../features/appointments/screens/AppointmentDetailScreen';
import RescheduleAppointmentScreen from '../../features/appointments/screens/RescheduleAppointmentScreen';
import CancelAppointmentScreen from '../../features/appointments/screens/CancelAppointmentScreen';
import PatientDashboardScreen from '../../features/clinical/screens/PatientDashboardScreen';
import RecoveryMainScreen from '../../features/clinical/screens/RecoveryMainScreen';
import MyRecoveryProgramsScreen from '../../features/clinical/screens/MyRecoveryProgramsScreen';
import RecoveryProgramDetailScreen from '../../features/clinical/screens/RecoveryProgramDetailScreen';
import TodaysSessionScreen from '../../features/clinical/screens/TodaysSessionScreen';
import ExerciseDetailScreen from '../../features/clinical/screens/ExerciseDetailScreen';
import ExerciseTimerActiveScreen from '../../features/clinical/screens/ExerciseTimerActiveScreen';
import ExerciseProgressScreen from '../../features/clinical/screens/ExerciseProgressScreen';
import SessionCompleteScreen from '../../features/clinical/screens/SessionCompleteScreen';
import RecoveryProgressAnalyticsScreen from '../../features/clinical/screens/RecoveryProgressAnalyticsScreen';
import NotificationsScreen from '../../features/notifications/screens/NotificationsScreen';
import ExerciseTimerScreen from '../../features/clinical/screens/ExerciseTimerScreen';
import TherapistDashboardScreen from '../../features/clinical/screens/TherapistDashboardScreen';
import PatientDetailScreen from '../../features/clinical/screens/PatientDetailScreen';
import PrescribeProgramScreen from '../../features/clinical/screens/PrescribeProgramScreen';
import MedicalRecordsScreen from '../../features/clinical/screens/MedicalRecordsScreen';
import InvoicesScreen from '../../features/payments/screens/InvoicesScreen';
import ChatScreen from '../../features/chat/screens/ChatScreen';
import ConversationsListScreen from '../../features/chat/screens/ConversationsListScreen';
import VideoCallScreen from '../../features/chat/screens/VideoCallScreen';
import MedicalRecordViewerScreen from '../../features/clinical/screens/MedicalRecordViewerScreen';
import PaymentsInvoicesScreen from '../../features/payments/screens/PaymentsInvoicesScreen';
import InvoiceDetailsScreen from '../../features/payments/screens/InvoiceDetailsScreen';
import SavedSpecialistsScreen from '../../features/appointments/screens/SavedSpecialistsScreen';
import NotificationPreferencesScreen from '../../features/auth/screens/NotificationPreferencesScreen';
import PrivacySecurityScreen from '../../features/auth/screens/PrivacySecurityScreen';
import HelpSupportScreen from '../../features/auth/screens/HelpSupportScreen';
import AboutScreen from '../../features/auth/screens/AboutScreen';
import ChangeMobileScreen from '../../features/auth/screens/ChangeMobileScreen';
import DeleteAccountScreen from '../../features/auth/screens/DeleteAccountScreen';
import TherapistCompleteProfileScreen from '../../features/auth/screens/TherapistCompleteProfileScreen';
import NeedHelpScreen from '../../features/auth/screens/NeedHelpScreen';
import TherapistScheduleScreen from '../../features/clinical/screens/TherapistScheduleScreen';
import TherapistPatientListScreen from '../../features/clinical/screens/TherapistPatientListScreen';
import ExerciseLibraryScreen from '../../features/clinical/screens/ExerciseLibraryScreen';
import AppointmentDetailsScreen from '../../features/appointments/screens/AppointmentDetailsScreen';
import ClinicalConsultationScreen from '../../features/clinical/screens/ClinicalConsultationScreen';
import WriteDoctorReviewScreen from '../../features/appointments/screens/WriteDoctorReviewScreen';
import SearchFilterScreen from '../../features/appointments/screens/SearchFilterScreen';
import EmergencyTriageScreen from '../../features/clinical/screens/EmergencyTriageScreen';
import AddMedicalRecordScreen from '../../features/clinical/screens/AddMedicalRecordScreen';
import ReviewSubmittedScreen from '../../features/appointments/screens/ReviewSubmittedScreen';
import BodyPainMapScreen from '../../features/clinical/screens/BodyPainMapScreen';
import ReferralRewardsScreen from '../../features/auth/screens/ReferralRewardsScreen';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Patient Bottom Tabs
function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary || '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Book') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Records') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Consultations' || route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={PatientDashboardScreen} options={{ tabBarLabel: 'Recovery' }} />
      <Tab.Screen name="Book" component={BookAppointmentScreen} options={{ tabBarLabel: 'Book Slot' }} />
      <Tab.Screen name="Appointments" component={MyBookingsScreen} options={{ tabBarLabel: 'My Bookings' }} />
      <Tab.Screen name="Records" component={MedicalRecordsVaultScreen} options={{ tabBarLabel: 'Vault' }} />
      <Tab.Screen name="Consultations" component={ConversationsListScreen} options={{ tabBarLabel: 'Therapist' }} />
      <Tab.Screen name="Profile" component={PatientProfileOverviewScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Therapist Bottom Tabs
function TherapistTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.secondary || '#0d9488',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Recovery') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Consultations' || route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={TherapistDashboardScreen} options={{ tabBarLabel: 'Overview' }} />
      <Tab.Screen name="Recovery" component={TherapistPatientListScreen} options={{ tabBarLabel: 'Recovery' }} />
      <Tab.Screen name="Appointments" component={TherapistScheduleScreen} options={{ tabBarLabel: 'Schedule' }} />
      <Tab.Screen name="Consultations" component={ConversationsListScreen} options={{ tabBarLabel: 'Messages' }} />
      <Tab.Screen name="Profile" component={ProfileSettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, isRestored } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!isRestored) {
    return null; // Brief splash load while restoring session from AsyncStorage
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          {/* Unauthenticated Onboarding & Login Flow */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="NeedHelp" component={NeedHelpScreen} />
        </>
      ) : !user?.isProfileCompleted ? (
        <>
          {/* Profile Completion Gatekeeping — User MUST complete profile before accessing Home */}
          {user?.role === 'therapist' ? (
            <Stack.Screen name="TherapistCompleteProfile" component={TherapistCompleteProfileScreen} />
          ) : (
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          )}
          <Stack.Screen name="EnablePermissions" component={EnablePermissionsScreen} />
          <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
        </>
      ) : (
        <>
          {/* Fully Verified & Completed App Access */}
          {user?.role === 'therapist' ? (
            <Stack.Screen name="TherapistHome" component={TherapistTabs} />
          ) : (
            <Stack.Screen name="PatientHome" component={PatientTabs} />
          )}

          {/* Authenticated Protected Clinical, Booking & Payment Screens */}
          <Stack.Screen name="MedicalRecordViewer" component={MedicalRecordViewerScreen} />
          <Stack.Screen name="PaymentsInvoices" component={PaymentsInvoicesScreen} />
          <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
          <Stack.Screen name="SavedSpecialists" component={SavedSpecialistsScreen} />
          <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
          <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="ChangeMobile" component={ChangeMobileScreen} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
          <Stack.Screen name="TherapistCompleteProfile" component={TherapistCompleteProfileScreen} />
          <Stack.Screen name="TherapistSchedule" component={TherapistScheduleScreen} />
          <Stack.Screen name="TherapistPatients" component={TherapistPatientListScreen} />
          <Stack.Screen name="PatientList" component={TherapistPatientListScreen} />
          <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
          <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
          <Stack.Screen name="ClinicalConsultation" component={ClinicalConsultationScreen} />
          <Stack.Screen name="RecoveryMain" component={RecoveryMainScreen} />
          <Stack.Screen name="MyRecoveryPrograms" component={MyRecoveryProgramsScreen} />
          <Stack.Screen name="RecoveryProgramDetail" component={RecoveryProgramDetailScreen} />
          <Stack.Screen name="TodaysSession" component={TodaysSessionScreen} />
          <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
          <Stack.Screen name="ExerciseTimerActive" component={ExerciseTimerActiveScreen} />
          <Stack.Screen name="SessionComplete" component={SessionCompleteScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="RecoveryProgressAnalytics" component={RecoveryProgressAnalyticsScreen} />
          <Stack.Screen name="RecoveryAnalytics" component={RecoveryProgressAnalyticsScreen} />
          <Stack.Screen name="RecoveryProgress" component={RecoveryProgressAnalyticsScreen} />
          <Stack.Screen name="TherapistDetail" component={TherapistDetailScreen} />
          <Stack.Screen name="SelectDateTime" component={SelectDateTimeScreen} />
          <Stack.Screen name="ChoosePayment" component={ChoosePaymentScreen} />
          <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
          <Stack.Screen name="AppointmentConfirmed" component={AppointmentConfirmedScreen} />
          <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
          <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
          <Stack.Screen name="Book" component={BookAppointmentScreen} />
          <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
          <Stack.Screen name="RescheduleAppointment" component={RescheduleAppointmentScreen} />
          <Stack.Screen name="CancelAppointment" component={CancelAppointmentScreen} />
          <Stack.Screen name="ExerciseTimer" component={ExerciseTimerScreen} />
          <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
          <Stack.Screen name="PrescribeProgram" component={PrescribeProgramScreen} />
          <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
          <Stack.Screen name="Invoices" component={InvoicesScreen} />
          <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ChatRoom" component={ChatScreen} />
          <Stack.Screen name="VideoCall" component={VideoCallScreen} />
          <Stack.Screen name="PatientProfileOverview" component={PatientProfileOverviewScreen} />
          <Stack.Screen name="EditPatientProfile" component={EditPatientProfileScreen} />
          <Stack.Screen name="MedicalInformation" component={MedicalInformationScreen} />
          <Stack.Screen name="MedicalRecordsVault" component={MedicalRecordsVaultScreen} />
          <Stack.Screen name="WriteDoctorReview" component={WriteDoctorReviewScreen} />
          <Stack.Screen name="SearchFilter" component={SearchFilterScreen} />
          <Stack.Screen name="EmergencyTriage" component={EmergencyTriageScreen} />
          <Stack.Screen name="AddMedicalRecord" component={AddMedicalRecordScreen} />
          <Stack.Screen name="ReviewSubmitted" component={ReviewSubmittedScreen} />
          <Stack.Screen name="BodyPainMap" component={BodyPainMapScreen} />
          <Stack.Screen name="ReferralRewards" component={ReferralRewardsScreen} />
          <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
          <Stack.Screen name="NeedHelp" component={NeedHelpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

