import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { logout, updateProfile } from '../authSlice';
import userApi from '../userApi';
import clinicalApi from '../../clinical/api';

const { width } = Dimensions.get('window');

export default function PatientProfileOverviewScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);

  // When Redux logs out, navigate back to the Welcome screen
  useEffect(() => {
    if (!isAuthenticated) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      );
    }
  }, [isAuthenticated]);
  const [activeProgram, setActiveProgram] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchAll = async () => {
        if (!token) return;
        try {
          const [profRes, progRes] = await Promise.allSettled([
            userApi.getMyProfile(token),
            clinicalApi.getActiveProgram(token),
          ]);

          if (profRes.status === 'fulfilled' && profRes.value?.success && profRes.value?.data) {
            const u = profRes.value.data.user || {};
            const p = profRes.value.data.profile || {};
            if (isMounted) {
              dispatch(updateProfile({
                ...u,
                ...p,
                height: p.height ?? u.height,
                weight: p.weight ?? u.weight,
                bloodGroup: p.bloodGroup ?? u.bloodGroup,
              }));
            }
          }

          if (progRes.status === 'fulfilled' && progRes.value?.success && progRes.value?.data) {
            if (isMounted) {
              setActiveProgram(progRes.value.data.assignment || progRes.value.data);
            }
          }
        } catch (err) {
          console.warn('[ProfileOverview] Refresh error:', err.message);
        }
      };
      fetchAll();
      return () => { isMounted = false; };
    }, [token, dispatch])
  );

  const userName = user?.name || user?.phoneNumber || 'Patient Profile';
  const userPhone = user?.phoneNumber || '';
  const avatarUrl = user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerShareBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* PROFILE HEADER CARD */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUrl }} style={styles.avatarPhoto} />
            <TouchableOpacity style={styles.cameraIconBtn} onPress={() => navigation.navigate('EditPatientProfile')}>
              <Ionicons name="camera-outline" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileSub}>{userPhone ? userPhone : 'Member since 2026'}</Text>

          <View style={styles.programPill}>
            <Text style={styles.programPillText}>{activeProgram?.programId?.title || activeProgram?.title || 'Active Recovery Program'}</Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditPatientProfile')}
          >
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* RECOVERY SNAPSHOT CARD */}
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotHeaderRow}>
            <Text style={styles.snapshotHeaderLabel}>RECOVERY SNAPSHOT</Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{activeProgram ? '1 Active' : '0 Active'}</Text>
            </View>
          </View>

          <View style={styles.snapshotContentRow}>
            <View style={styles.scoreGaugeCircle}>
              <Text style={styles.scoreNumberText}>{activeProgram?.recoveryScore ?? 0}%</Text>
              <Text style={styles.scoreLabelText}>Score</Text>
            </View>

            <View style={styles.snapshotMetricsCol}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>NEXT SESSION</Text>
                <Text style={styles.metricValue}>Today 10:30 AM</Text>
              </View>

              <View style={[styles.metricItem, { marginTop: 8 }]}>
                <Text style={styles.metricLabel}>STREAK</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flame" size={14} color="#d97706" style={{ marginRight: 4 }} />
                  <Text style={styles.metricValueBold}>{activeProgram?.streak || 0} Day Streak</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewProgressLink}
            onPress={() => navigation.navigate('RecoveryProgressAnalytics')}
          >
            <Text style={styles.viewProgressLinkText}>View Recovery Progress ➔</Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACCESS 2x2 GRID */}
        <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
        <View style={styles.quickGrid}>
          {/* Item 1: Medical Information */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MedicalInformation')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: '#e6f0ff' }]}>
              <Ionicons name="medical-outline" size={22} color="#003D9B" />
            </View>
            <Text style={styles.gridTitle}>Medical Information</Text>
            <Text style={styles.gridSub}>Vitals & Conditions</Text>
          </TouchableOpacity>

          {/* Item 2: Medical Reports */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MedicalRecordsVault')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="document-text-outline" size={22} color="#16a34a" />
            </View>
            <Text style={styles.gridTitle}>Medical Reports</Text>
            <Text style={styles.gridSub}>Scans & Documents</Text>
          </TouchableOpacity>

          {/* Item 3: Payments & Invoices */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PaymentsInvoices')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="card-outline" size={22} color="#d97706" />
            </View>
            <Text style={styles.gridTitle}>Payments & Invoices</Text>
            <Text style={styles.gridSub}>Billing Receipts</Text>
          </TouchableOpacity>

          {/* Item 4: Saved Specialists */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SavedSpecialists')}
          >
            <View style={[styles.gridIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="people-outline" size={22} color="#9333ea" />
            </View>
            <Text style={styles.gridTitle}>Saved Specialists</Text>
            <Text style={styles.gridSub}>Your Doctors</Text>
          </TouchableOpacity>
        </View>

        {/* ACCOUNT SETTINGS LIST */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>ACCOUNT SETTINGS</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Ionicons name="notifications-outline" size={18} color="#64748b" style={{ marginRight: 12 }} />
            <Text style={styles.settingsText}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('PrivacySecurity')}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={{ marginRight: 12 }} />
            <Text style={styles.settingsText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('ReferralRewards')}
          >
            <Ionicons name="gift-outline" size={18} color="#ea580c" style={{ marginRight: 12 }} />
            <Text style={[styles.settingsText, { color: '#ea580c', fontWeight: '700' }]}>Refer & Earn ₹500</Text>
            <View style={{ backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 'auto', marginRight: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#ea580c' }}>REWARDS</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('NeedHelp')}
          >
            <Ionicons name="help-circle-outline" size={18} color="#64748b" style={{ marginRight: 12 }} />
            <Text style={styles.settingsText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('About')}
          >
            <Ionicons name="information-circle-outline" size={18} color="#64748b" style={{ marginRight: 12 }} />
            <Text style={styles.settingsText}>About ONE MEDICAL</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.85}
          onPress={() => dispatch(logout())}
        >
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 2.4.0-p1a</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBackBtn: {
    paddingRight: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  programPill: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 14,
  },
  programPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 0.5,
  },
  editProfileBtn: {
    width: '100%',
    backgroundColor: '#003D9B',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  snapshotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  snapshotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  snapshotHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  activePill: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#003D9B',
  },
  snapshotContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreGaugeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scoreNumberText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scoreLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  snapshotMetricsCol: {
    flex: 1,
  },
  metricItem: {},
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  metricValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewProgressLink: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    alignItems: 'center',
  },
  viewProgressLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 11,
    color: '#64748b',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  logoutBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  versionText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
