import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';

export default function PatientDetailScreen({ route, navigation }) {
  const { patient } = route.params;
  const { token } = useSelector((state) => state.auth);
  const patientId = patient?.patientId || patient?.userId || patient?._id || patient?.id;

  const [clinicalOverview, setClinicalOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      if (!patientId || !token) return;
      try {
        setLoading(true);
        const res = await clinicalApi.getPatientClinicalOverview(patientId, token);
        if (res.success && res.data) {
          setClinicalOverview(res.data);
        }
      } catch (err) {
        console.warn('[PatientDetail] Overview load failed:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [patientId, token]);

  const activeProg = clinicalOverview?.activeProgram;
  const patientName = patient?.name || `Patient ${String(patientId).slice(-4)}`;
  const compliance = activeProg?.complianceRate || 0;
  const latestPain = clinicalOverview?.latestPainScore;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{patientName}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading patient clinical record...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* PATIENT PROFILE CARD */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{patientName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.patientNameText}>{patientName}</Text>
              <Text style={styles.patientIdText}>ID: #{String(patientId).slice(-6).toUpperCase()}</Text>
              {patient?.phone ? <Text style={styles.phoneText}>📞 {patient.phone}</Text> : null}
            </View>
          </View>

          {/* ACTIVE RECOVERY PROGRAM CARD */}
          <Text style={styles.sectionTitle}>Active Rehabilitation Protocol</Text>
          {activeProg ? (
            <View style={styles.programCard}>
              <View style={styles.programTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.programTitleText}>{activeProg.title}</Text>
                  <Text style={styles.programMetaText}>
                    Week {activeProg.currentWeek || 1} of {activeProg.targetWeeks || 4} Weeks
                  </Text>
                </View>
                <View style={styles.recoveryScoreCircle}>
                  <Text style={styles.recoveryScoreVal}>{activeProg.recoveryScore || compliance}%</Text>
                  <Text style={styles.recoveryScoreLab}>SCORE</Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{compliance}%</Text>
                  <Text style={styles.metricLab}>Compliance</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{activeProg.completedSessionsCount || 0}</Text>
                  <Text style={styles.metricLab}>Sessions Done</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: latestPain >= 7 ? '#dc2626' : '#0f172a' }]}>
                    {latestPain !== null && latestPain !== undefined ? `${latestPain}/10` : 'None'}
                  </Text>
                  <Text style={styles.metricLab}>Latest Pain</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="fitness-outline" size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No Active Protocol Assigned</Text>
              <Text style={styles.emptySub}>Prescribe a customized program to track exercises, pain ratings, and session compliance.</Text>
              <TouchableOpacity
                style={styles.prescribeBtn}
                onPress={() => navigation.navigate('PrescribeProgram', { patientId, targetPatientId: patientId, patientName })}
              >
                <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.prescribeBtnText}>Prescribe Program</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* QUICK ACTIONS */}
          <Text style={styles.sectionTitle}>Clinical Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('PrescribeProgram', { patientId, targetPatientId: patientId, patientName })}
            >
              <Ionicons name="create-outline" size={22} color="#003D9B" style={{ marginBottom: 6 }} />
              <Text style={styles.actionCardTitle}>Prescribe Protocol</Text>
              <Text style={styles.actionCardSub}>Assign/Modify exercises</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('RecoveryProgressAnalytics', { patientId, programId: activeProg?.id })}
            >
              <Ionicons name="analytics-outline" size={22} color="#16a34a" style={{ marginBottom: 6 }} />
              <Text style={styles.actionCardTitle}>Recovery Analytics</Text>
              <Text style={styles.actionCardSub}>View progress charts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MedicalRecordsVault', { patientId })}
            >
              <Ionicons name="folder-open-outline" size={22} color="#0284c7" style={{ marginBottom: 6 }} />
              <Text style={styles.actionCardTitle}>Medical Vault</Text>
              <Text style={styles.actionCardSub}>View MRI & lab reports</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  patientIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  programCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  programTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  programTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  programMetaText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recoveryScoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryScoreVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#166534',
  },
  recoveryScoreLab: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803d',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLab: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 14,
  },
  prescribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003D9B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  prescribeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionCardSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
