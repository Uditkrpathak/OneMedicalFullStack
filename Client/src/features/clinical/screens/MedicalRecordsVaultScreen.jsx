import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import clinicalApi from '../api';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'MRI_SCAN', label: 'MRI & X-Rays' },
  { id: 'CONSULTATION_REPORT', label: 'Consultations' },
  { id: 'TREATMENT_PLAN', label: 'Treatment Plans' },
  { id: 'PRESCRIPTION', label: 'Prescriptions' },
  { id: 'DISCHARGE_SUMMARY', label: 'Discharge' },
  { id: 'LAB_REPORT', label: 'Labs' },
];

export default function MedicalRecordsVaultScreen({ navigation, route }) {
  const { token, user } = useSelector((state) => state.auth);
  const patientId = route.params?.patientId || (user?.role === 'patient' ? (user?._id || user?.userId) : null);
  const patientName = route.params?.patientName || '';

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecords = async () => {
    if (!token) return;
    try {
      const params = {
        ...(patientId ? { patientId } : {}),
        ...(activeTab !== 'ALL' ? { category: activeTab } : {}),
      };
      const res = await clinicalApi.listMedicalRecords(params, token);
      if (res.success && Array.isArray(res.data)) {
        setRecords(res.data);
      }
    } catch (err) {
      console.warn('[MedicalRecordsVault] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [token, patientId, activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  // Filter records by search query and category tab
  const filteredRecords = records.filter((rec) => {
    const title = (rec.title || '').toLowerCase();
    const doc = (rec.doctorName || '').toLowerCase();
    const hosp = (rec.hospitalName || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = title.includes(q) || doc.includes(q) || hosp.includes(q);
    if (!matchesSearch) return false;

    if (activeTab !== 'ALL') {
      const category = (rec.category || rec.recordType || rec.type || '').toUpperCase();
      if (activeTab === 'MRI_SCAN' || activeTab === 'X_RAY') {
        return category === 'MRI_SCAN' || category === 'X_RAY' || category.includes('MRI') || category.includes('X_RAY') || category.includes('XRAY');
      }
      return category === activeTab;
    }

    return true;
  });

  const getCategoryBadgeColor = (category = '') => {
    const cat = category.toUpperCase();
    if (cat === 'CONSULTATION_REPORT') return { bg: '#eff6ff', text: '#003D9B', icon: 'clipboard-outline' };
    if (cat === 'TREATMENT_PLAN') return { bg: '#f0fdf4', text: '#16a34a', icon: 'fitness-outline' };
    if (cat === 'MRI_SCAN' || cat === 'X_RAY') return { bg: '#e0f2fe', text: '#0369a1', icon: 'scan-outline' };
    if (cat === 'PRESCRIPTION') return { bg: '#fee2e2', text: '#b91c1c', icon: 'receipt-outline' };
    if (cat === 'DISCHARGE_SUMMARY') return { bg: '#fef3c7', text: '#b45309', icon: 'exit-outline' };
    if (cat === 'LAB_REPORT') return { bg: '#f3e8ff', text: '#7e22ce', icon: 'flask-outline' };
    return { bg: '#e2e8f0', text: '#334155', icon: 'document-text-outline' };
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Document PDF';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {user?.role === 'therapist' ? 'Clinical Records Vault' : 'Medical Vault'}
        </Text>
        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => navigation.navigate('AddMedicalRecord', patientId ? { patientId } : {})}
        >
          <Ionicons name="add" size={16} color="#003D9B" style={{ marginRight: 2 }} />
          <Text style={styles.addBtnHeaderText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* TOP CONTROLS (SEARCH & CATEGORY TABS) */}
      <View style={styles.topStickyHeader}>
        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records, doctors, hospitals..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORY FILTER TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabPillText, isSelected && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {/* SECURITY ASSURANCE BANNER */}
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#16a34a" style={{ marginRight: 8 }} />
          <Text style={styles.securityBannerText}>
            End-to-end encrypted Cloudinary storage. Private authenticated access links expire in 300s.
          </Text>
        </View>

        {/* RECORDS LIST */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#003D9B" />
            <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading private documents...</Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>
              {user?.role === 'therapist' ? 'No Patient Documents Found' : 'No Medical Records Found'}
            </Text>
            <Text style={styles.emptySub}>
              {user?.role === 'therapist'
                ? 'No diagnostic reports found for your patients. Use the button below to upload scans or clinical notes.'
                : (searchQuery ? 'No documents match your search criteria.' : 'Upload your MRI scans, prescriptions, or lab reports to keep them securely stored.')}
            </Text>
            <TouchableOpacity
              style={styles.emptyUploadBtn}
              onPress={() => navigation.navigate('AddMedicalRecord', patientId ? { patientId } : {})}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyUploadBtnText}>
                {user?.role === 'therapist' ? 'Upload Patient Document' : 'Upload New Document'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredRecords.map((rec) => {
              const badge = getCategoryBadgeColor(rec.category || rec.recordType);
              const dateStr = rec.recordDate
                ? new Date(rec.recordDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <TouchableOpacity
                  key={rec.id || rec._id}
                  style={styles.recordCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('MedicalRecordViewer', {
                      recordId: rec.id || rec._id,
                      record: rec,
                    })
                  }
                >
                  <View style={styles.recordCardTop}>
                    <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
                      <Ionicons name={badge.icon} size={12} color={badge.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.categoryBadgeText, { color: badge.text }]}>
                        {(rec.category || rec.recordType || 'DOCUMENT').replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.recordDateText}>{dateStr}</Text>
                  </View>

                  <Text style={styles.recordTitle}>{rec.title}</Text>

                  {(rec.doctorName || rec.hospitalName) ? (
                    <Text style={styles.recordFacility}>
                      {rec.doctorName ? `Dr. ${rec.doctorName.replace(/^Dr\.?\s*/i, '')}` : ''}
                      {rec.doctorName && rec.hospitalName ? ' • ' : ''}
                      {rec.hospitalName || ''}
                    </Text>
                  ) : null}

                  <View style={styles.recordFooter}>
                    <View style={styles.fileMeta}>
                      <Ionicons name="document-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.fileMetaText}>{formatFileSize(rec.fileSizeBytes || rec.sizeBytes)}</Text>
                    </View>
                    <View style={styles.viewLink}>
                      <Text style={styles.viewLinkText}>View Secure PDF</Text>
                      <Ionicons name="chevron-forward" size={14} color="#003D9B" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#e6f0ff',
  },
  addBtnHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  topStickyHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  tabsRow: {
    paddingBottom: 4,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  tabPillActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabPillTextActive: {
    color: '#ffffff',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  securityBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 15,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003D9B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyUploadBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recordCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  recordDateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  recordFacility: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
    marginRight: 2,
  },
});
