import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';
import { colors } from '../../../theme/colors';

const FILTER_TABS = ['All Patients', 'Active Care', 'Post-Op', 'High Priority'];

export default function TherapistPatientListScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All Patients');

  const fetchPatients = async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await clinicalApi.getAssignedPatients(token);
      if (res.success && Array.isArray(res.data)) {
        setPatients(res.data);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.warn('[TherapistPatientList] fetch error:', err.message);
      setPatients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.condition || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').includes(search);

    if (!matchesSearch) return false;

    if (selectedFilter === 'Active Care') {
      return p.status === 'active' || (p.complianceRate && p.complianceRate > 70);
    }
    if (selectedFilter === 'Post-Op') {
      return (p.condition || '').toLowerCase().includes('post') || (p.condition || '').toLowerCase().includes('acl');
    }
    if (selectedFilter === 'High Priority') {
      return (p.painScore && p.painScore >= 6) || (p.complianceRate && p.complianceRate < 70) || p.status === 'high_priority';
    }
    return true;
  });

  const renderPatientCard = ({ item }) => {
    const initials = (item.name || 'P')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const isHighPain = item.painScore >= 7;

    return (
      <View style={styles.patientCard}>
        {/* Top Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName} numberOfLines={1}>
                {item.name}
              </Text>
              {isHighPain && (
                <View style={styles.painAlertBadge}>
                  <Ionicons name="warning" size={12} color="#dc2626" />
                  <Text style={styles.painAlertText}>Pain {item.painScore}/10</Text>
                </View>
              )}
            </View>

            <Text style={styles.patientMeta}>
              {item.age ? `${item.age} yrs` : ''}
              {item.age && item.gender ? ' • ' : ''}
              {item.gender || ''}
              {item.phone ? ` • ${item.phone}` : ''}
            </Text>
          </View>
        </View>

        {/* Diagnosis & Program Section */}
        <View style={styles.diagnosisSection}>
          <View style={styles.diagnosisRow}>
            <Ionicons name="medical-outline" size={14} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={styles.diagnosisTitle} numberOfLines={1}>
              {item.condition || item.diagnosis || 'General Physical Therapy'}
            </Text>
          </View>

          {item.programName && (
            <Text style={styles.programSub} numberOfLines={1}>
              📋 Program: {item.programName}
            </Text>
          )}

          {/* Recovery & Compliance Stats Row */}
          <View style={styles.complianceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.complianceLabel}>Recovery Progress</Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(item.recoveryScore || item.complianceRate || 36, 100)}%`,
                      backgroundColor:
                        (item.recoveryScore || item.complianceRate || 36) > 70
                          ? '#16a34a'
                          : (item.recoveryScore || item.complianceRate || 36) > 40
                          ? '#003D9B'
                          : '#f59e0b',
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.complianceValue}>{item.recoveryScore || item.complianceRate || 36}%</Text>
          </View>
        </View>

        {/* Action Buttons Footer */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.actionBtnRecovery}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('RecoveryAnalytics', {
                patientId: item.userId || item.patientId || item._id,
                patientName: item.name,
                programId: item.activeProgramId,
              })
            }
          >
            <Ionicons name="pulse" size={15} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.actionBtnRecoveryText}>Recovery Trends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnPrescribe}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('PrescribeProgram', {
                patient: item,
                patientId: item.userId || item.patientId || item._id,
                patientName: item.name,
              })
            }
          >
            <Ionicons name="add-circle-outline" size={15} color="#003D9B" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnPrescribeText}>Prescribe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSecondary}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('PatientDetail', {
                patient: item,
                patientId: item.patientId || item.userId || item._id,
              })
            }
          >
            <Ionicons name="document-text-outline" size={16} color="#003D9B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSecondary}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('Chat', {
                recipientId: item.userId || item.patientId || item._id,
                recipientName: item.name,
                recipientRole: 'patient',
              })
            }
          >
            <Ionicons name="chatbubbles-outline" size={16} color="#003D9B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Patient Recovery & Roster</Text>
          <Text style={styles.headerSubtitle}>
            Track rehabilitation progression, compliance & pain trends
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color="#003D9B" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients by name, phone, or condition..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        {FILTER_TABS.map((tab) => {
          const isActive = selectedFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Patients List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={styles.loadingText}>Loading assigned patients...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item, index) => item.patientId || item.userId || item._id || String(index)}
          renderItem={renderPatientCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={54} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No patients matching "${search}"`
                  : 'Patients booked with you will automatically appear in your active roster.'}
              </Text>
            </View>
          }
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003D9B',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  painAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  painAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  patientMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  diagnosisSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosisTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
    flex: 1,
  },
  programSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  complianceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  complianceValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  actionBtnRecovery: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnRecoveryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionBtnPrescribe: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnPrescribeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  actionBtnSecondary: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
