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

export default function MedicalRecordViewerScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const recordId = route.params?.recordId || route.params?.record?._id || route.params?.record?.id;
  const initialRecord = route.params?.record;

  const [record, setRecord] = useState(initialRecord || null);
  const [loading, setLoading] = useState(!initialRecord?.downloadUrl);
  const [refreshingUrl, setRefreshingUrl] = useState(false);

  const fetchFreshRecord = async () => {
    if (!recordId) return;
    try {
      setRefreshingUrl(true);
      const res = await clinicalApi.getMedicalRecordById(recordId, token);
      if (res.success && res.data) {
        setRecord(res.data);
      }
    } catch (err) {
      console.warn('Failed to load fresh record:', err.message);
    } finally {
      setLoading(false);
      setRefreshingUrl(false);
    }
  };

  useEffect(() => {
    fetchFreshRecord();
  }, [recordId, token]);

  const recordTitle = record?.title || 'Clinical Document';
  const recordCategory = (record?.category || record?.recordType || 'DOCUMENT').replace('_', ' ');
  const recordDoctor = record?.doctorName ? `Dr. ${record.doctorName.replace(/^Dr\.?\s*/i, '')}` : null;
  const recordHospital = record?.hospitalName || null;
  const recordDate = record?.recordDate
    ? new Date(record.recordDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const downloadUrl = record?.downloadUrl;
  const expiresAt = record?.downloadUrlExpiresAt
    ? new Date(record.downloadUrlExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'in 5 mins';

  const handleDownload = () => {
    if (!downloadUrl) {
      Alert.alert('Secure Link Expired', 'Refreshing authenticated access link...');
      fetchFreshRecord();
      return;
    }
    Alert.alert(
      'Authenticated Download Link',
      `Time-limited secure private URL (valid for 300 seconds):\n\n${downloadUrl}`,
      [{ text: 'OK' }]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to remove this record from your vault?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await clinicalApi.deleteMedicalRecord(recordId, token);
              if (res.success) {
                Alert.alert('Deleted', 'Medical record removed from vault.', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Error', res.error?.message || 'Failed to delete record.');
              }
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Document Viewer</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Generating secure access token...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* SECURITY VAULT HERO CARD */}
          <View style={styles.heroCard}>
            <View style={styles.securityBadge}>
              <Ionicons name="lock-closed" size={14} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.securityBadgeText}>HIPAA Compliant S3 Private Object</Text>
            </View>

            <Text style={styles.docTitle}>{recordTitle}</Text>

            <View style={styles.metaRow}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{recordCategory}</Text>
              </View>
              <Text style={styles.dateText}>{recordDate}</Text>
            </View>

            {(recordDoctor || recordHospital) && (
              <View style={styles.facilityBox}>
                <Ionicons name="business-outline" size={16} color="#003D9B" style={{ marginRight: 8 }} />
                <Text style={styles.facilityText}>
                  {recordDoctor ? recordDoctor : ''}
                  {recordDoctor && recordHospital ? ' • ' : ''}
                  {recordHospital ? recordHospital : ''}
                </Text>
              </View>
            )}
          </View>

          {/* PRESIGNED URL ACCESS CARD */}
          <View style={styles.viewerCard}>
            <View style={styles.pdfIconCircle}>
              <Ionicons name="document-text" size={48} color="#003D9B" />
            </View>

            <Text style={styles.fileNameText}>{record?.fileName || 'document.pdf'}</Text>
            <Text style={styles.fileSizeText}>
              {record?.fileSizeBytes ? `${(record.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB'} • Private Storage
            </Text>

            <View style={styles.expirationBanner}>
              <Ionicons name="timer-outline" size={16} color="#d97706" style={{ marginRight: 6 }} />
              <Text style={styles.expirationText}>
                Presigned download link active (expires at {expiresAt})
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.downloadBtn}
                activeOpacity={0.85}
                onPress={handleDownload}
              >
                <Ionicons name="cloud-download-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.downloadBtnText}>Open / Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refreshBtn}
                disabled={refreshingUrl}
                onPress={fetchFreshRecord}
              >
                {refreshingUrl ? (
                  <ActivityIndicator size="small" color="#003D9B" />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color="#003D9B" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* CLINICAL NOTES */}
          {record?.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Clinical Observations</Text>
              <Text style={styles.notesContent}>{record.notes}</Text>
            </View>
          ) : null}
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
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
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
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003D9B',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  facilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  facilityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  viewerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  pdfIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  fileSizeText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  expirationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 20,
  },
  expirationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    height: 48,
    borderRadius: 14,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  notesContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});
