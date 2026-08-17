import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { logout, updateProfile } from '../authSlice';
import { useUpdatePatientProfileMutation, useGetMyProfileQuery } from '../authApiSlice';
import { colors } from '../../../theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ProfileSettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.auth);

  // Navigate to Welcome when Redux state clears on logout
  useEffect(() => {
    if (!isAuthenticated) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      );
    }
  }, [isAuthenticated]);

  const { data: profileResponse, isLoading: isFetchingProfile } = useGetMyProfileQuery();
  const [updatePatientProfile, { isLoading: isSaving }] = useUpdatePatientProfileMutation();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Preferences
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || user.phone || '');
    }
    if (profileResponse?.data?.profile) {
      const p = profileResponse.data.profile;
      if (p.medicalConditions) setConditions(Array.isArray(p.medicalConditions) ? p.medicalConditions.join(', ') : p.medicalConditions);
      if (p.allergies) setAllergies(Array.isArray(p.allergies) ? p.allergies.join(', ') : p.allergies);
      if (p.emergencyContact) {
        setEmergencyName(p.emergencyContact.name || '');
        setEmergencyPhone(p.emergencyContact.phone || '');
      }
    }
  }, [user, profileResponse]);

  const handleSaveProfile = async () => {
    try {
      const payload = {
        name: name.trim(),
        medicalConditions: conditions ? conditions.split(',').map(s => s.trim()) : [],
        allergies: allergies ? allergies.split(',').map(s => s.trim()) : [],
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
        },
      };

      await updatePatientProfile(payload).unwrap();
      dispatch(updateProfile({ name: name.trim(), isProfileCompleted: true }));
      Alert.alert('Profile Saved 🎉', 'Your profile details have been updated in MongoDB.');
    } catch (err) {
      Alert.alert('Error', err?.data?.error?.message || 'Failed to update profile.');
    }
  };

  const handleUpdatePhone = () => {
    navigation.navigate('ChangeMobile');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Request Account Deletion',
      'Are you sure? Your account will enter a 30-day grace period.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Request', style: 'destructive', onPress: () => {
            dispatch(logout());
            Alert.alert('Account Scheduled for Deletion', 'You have been logged out.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Account & Medical Settings</Text>
        <Text style={styles.roleTag}>Logged in as: {user?.role ? user.role.toUpperCase() : 'PATIENT'}</Text>
      </View>

      {isFetchingProfile && (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginBottom: 10 }} />
      )}

      {/* Personal Details */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name="person-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.cardTitle}>Personal Information</Text>
        </View>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

        <Text style={styles.label}>Phone Number (Requires OTP to change)</Text>
        <View style={styles.phoneRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.verifyBtn} onPress={handleUpdatePhone}>
            <Text style={styles.verifyBtnText}>Verify OTP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Medical Info */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name="medical-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.cardTitle}>Medical Conditions & Intake</Text>
        </View>
        <Text style={styles.label}>Current Medical Conditions (comma separated)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={conditions} onChangeText={setConditions} multiline />

        <Text style={styles.label}>Known Allergies</Text>
        <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10 }}>
          <Ionicons name="warning-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.cardTitleSub}>Emergency Contact</Text>
        </View>
        <Text style={styles.label}>Contact Name</Text>
        <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} />

        <Text style={styles.label}>Contact Phone</Text>
        <TextInput style={styles.input} value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
      </View>

      {/* Notifications */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name="notifications-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.cardTitle}>Notification Preferences</Text>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Push Notifications (Reminders & Alerts)</Text>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: colors.primary }} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>SMS Notifications (Appointment Reminders)</Text>
          <Switch value={smsEnabled} onValueChange={setSmsEnabled} trackColor={{ true: colors.primary }} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Email Updates (Invoices & Progress)</Text>
          <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ true: colors.primary }} />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save Profile Changes</Text>
        )}
      </TouchableOpacity>

      {/* Logout & Delete */}
      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={() => dispatch(logout())}
      >
        <Text style={styles.logoutBtnText}>Logout of Account</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={styles.deleteBtnText}>Request Account Deletion</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 50 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  roleTag: { fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 4, letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.slate800, marginBottom: 14 },
  cardTitleSub: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginTop: 14, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate600, marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.slate800, marginBottom: 14 },
  multiline: { height: 60, textAlignVertical: 'top' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  verifyBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginLeft: 10 },
  verifyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  switchLabel: { fontSize: 13, color: colors.slate700, flex: 1, marginRight: 10 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  logoutBtnText: { color: colors.slate700, fontSize: 15, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  deleteBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});
