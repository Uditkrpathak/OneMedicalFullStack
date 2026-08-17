import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import userApi from '../userApi';

export default function NotificationPreferencesScreen({ navigation }) {
  const { token } = useSelector((state) => state.auth);
  const [masterEnabled, setMasterEnabled] = useState(true);

  const [prefs, setPrefs] = useState({
    upcomingAppointment: true,
    appointmentConfirmation: true,
    appointmentRescheduled: true,
    appointmentCancelled: true,
    todayExercise: true,
    recoveryProgramUpdates: true,
    weeklyProgressSummary: true,
    achievementNotifications: true,
    newMedicalReports: true,
    paymentConfirmation: true,
    invoiceAvailable: false,
    healthTips: false,
    newFeatures: false,
    promotions: false,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!token) return;
      try {
        const res = await userApi.getNotifications(token);
        if (res.success && res.data) {
          setPrefs(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.warn('Could not load preferences from server:', err.message);
      }
    };
    loadPreferences();
  }, [token]);

  const toggleSwitch = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (token) {
      try {
        await userApi.updateNotifications({ [key]: updated[key] }, token);
      } catch (err) {
        console.warn('Failed to sync notification pref:', err.message);
      }
    }
  };

  const handleReset = () => {
    const defaultPrefs = {
      upcomingAppointment: true,
      appointmentConfirmation: true,
      appointmentRescheduled: true,
      appointmentCancelled: true,
      todayExercise: true,
      recoveryProgramUpdates: true,
      weeklyProgressSummary: true,
      achievementNotifications: true,
      newMedicalReports: true,
      paymentConfirmation: true,
      invoiceAvailable: false,
      healthTips: false,
      newFeatures: false,
      promotions: false,
    };
    setPrefs(defaultPrefs);
    setMasterEnabled(true);
    updatePrefs(defaultPrefs);
    Alert.alert('Reset to Default', 'Notification settings restored to defaults.');
  };

  const renderCategory = (title, items) => (
    <View style={styles.categoryWrap}>
      <Text style={styles.categoryTitle}>{title}</Text>
      {items.map(({ key, label }, idx) => (
        <View 
          key={key} 
          style={[styles.toggleRow, idx === items.length - 1 && { borderBottomWidth: 0 }]}
        >
          <Text style={styles.toggleLabel}>{label}</Text>
          <Switch
            value={masterEnabled && prefs[key]}
            onValueChange={() => toggleSwitch(key)}
            trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
            thumbColor={masterEnabled && prefs[key] ? '#16a34a' : '#ffffff'}
          />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications Preference</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* MASTER TOGGLE CARD */}
        <View style={styles.masterCard}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.masterTitle}>Enable Notifications</Text>
            <Text style={styles.masterSub}>
              Receive important updates about your appointments and recovery.
            </Text>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={setMasterEnabled}
            trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
            thumbColor={masterEnabled ? '#16a34a' : '#ffffff'}
          />
        </View>

        {renderCategory('APPOINTMENTS', [
          { key: 'upcomingAppointment', label: 'Upcoming Appointment Reminder' },
          { key: 'appointmentConfirmation', label: 'Appointment Confirmation' },
          { key: 'appointmentRescheduled', label: 'Appointment Rescheduled' },
          { key: 'appointmentCancelled', label: 'Appointment Cancelled' },
        ])}

        {renderCategory('RECOVERY', [
          { key: 'todayExercise', label: "Today's Exercise Reminder" },
          { key: 'recoveryProgramUpdates', label: 'Recovery Program Updates' },
          { key: 'weeklyProgressSummary', label: 'Weekly Progress Summary' },
          { key: 'achievementNotifications', label: 'Achievement Notifications' },
        ])}

        {renderCategory('REPORTS & PAYMENTS', [
          { key: 'newMedicalReports', label: 'New Medical Reports' },
          { key: 'paymentConfirmation', label: 'Payment Confirmation' },
          { key: 'invoiceAvailable', label: 'Invoice Available' },
        ])}

        {renderCategory('MARKETING', [
          { key: 'healthTips', label: 'Health Tips' },
          { key: 'newFeatures', label: 'New Features' },
          { key: 'promotions', label: 'Promotions' },
        ])}

        <View style={styles.resetWrap}>
          <TouchableOpacity style={styles.resetPillBtn} onPress={handleReset}>
            <Text style={styles.resetPillText}>Reset to Default</Text>
          </TouchableOpacity>
          <Text style={styles.resetFooterSub}>Changes will be synced across all your devices.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 20,
  },
  masterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  masterSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  categoryWrap: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  resetWrap: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  resetPillBtn: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
  },
  resetPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  resetFooterSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
