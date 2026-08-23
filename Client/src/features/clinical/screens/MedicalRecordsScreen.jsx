import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import clinicalApi from '../api';
import EmptyState from '../../../shared/components/EmptyState';

export default function MedicalRecordsScreen({ navigation, route }) {
  const { token, user } = useSelector(state => state.auth);
  const isTherapist = user?.role === 'therapist' || user?.role === 'clinic_admin';
  const patientId = route.params?.patientId || (user?.role === 'patient' ? (user?._id || user?.userId) : null);
  const patientName = route.params?.patientName || '';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await clinicalApi.listMedicalRecords(patientId ? { patientId } : {}, token);
      if (res.success && Array.isArray(res.data)) {
        setRecords(res.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.warn('Error fetching medical records:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [token, patientId])
  );

  const handleDelete = (recId) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this medical document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await clinicalApi.deleteMedicalRecord(recId, token);
              if (res.success) {
                setRecords(prev => prev.filter(r => (r._id || r.id) !== recId));
                Alert.alert('Deleted', 'Record removed successfully.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete record.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isTherapist ? 'Clinical Records & Patient Scans' : 'Medical Records & Scans'}
        </Text>
        <Text style={styles.subtitle}>
          {isTherapist
            ? 'Review and manage diagnostic reports, scans, and clinical documents across your patients'
            : 'Protected Health Information (PHI) encrypted and stored securely'}
        </Text>
      </View>

      {/* Upload Action Card */}
      <View style={styles.uploadCard}>
        <Text style={styles.uploadTitle}>
          {isTherapist ? '📄 Upload Patient Document' : '📄 Upload New Document'}
        </Text>
        <Text style={styles.uploadDesc}>
          {isTherapist
            ? 'Upload MRI scans, X-Rays, prescriptions, or clinical notes for your patients (PDF/JPEG).'
            : 'Upload MRI scans, X-Rays, or clinical doctor notes (PDF/JPEG).'}
        </Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => navigation.navigate('AddMedicalRecord', patientId ? { patientId } : {})}
        >
          <Text style={styles.uploadBtnText}>
            {isTherapist ? '+ Upload Patient Medical Document' : '+ Add New Medical Document'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Records List Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>
          {isTherapist
            ? (patientName ? `${patientName}'s Records (${records.length} files)` : `Patient Records (${records.length} files)`)
            : `My Health Vault (${records.length} files)`}
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading secure records...</Text>
        </View>
      ) : records.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={isTherapist ? "No Patient Records Found" : "No Medical Records Found"}
          description={
            isTherapist
              ? "No clinical documents found for this view. Use the button above to upload diagnostic scans or notes for your patient."
              : "Your medical vault is empty. Upload your previous scans, prescriptions, or discharge summaries for your specialist."
          }
          buttonText={isTherapist ? "Upload Patient Document" : "Upload First Document"}
          onButtonPress={() => navigation.navigate('AddMedicalRecord', patientId ? { patientId } : {})}
        />
      ) : (
        records.map((rec) => {
          const recId = rec._id || rec.id;
          const recType = rec.type || rec.category || 'scan';
          const recTitle = rec.title || rec.name || 'Medical Document';
          const recDate = rec.recordDate || rec.createdAt
            ? new Date(rec.recordDate || rec.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Recent';

          return (
            <TouchableOpacity
              key={recId}
              style={styles.recordCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MedicalRecordViewer', { recordId: recId, record: rec })}
            >
              <View style={styles.recordIconBox}>
                <Ionicons
                  name={recType.includes('scan') || recType.includes('mri') ? 'images-outline' : 'document-text-outline'}
                  size={22}
                  color="#003D9B"
                />
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle} numberOfLines={1}>{recTitle}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{rec.category || 'Clinical Report'}</Text>
                  </View>
                  <Text style={styles.recordMeta}>{recDate} • {rec.size || 'Encrypted PDF'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(recId)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}

      {/* Security Disclaimer */}
      <View style={styles.securityNote}>
        <Text style={styles.securityText}>🔒 Files are stored with end-to-end encryption. Downloads and access are issued via authenticated access tokens with audit logging.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  uploadCard: { backgroundColor: '#e6f0ff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 24 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: '#003D9B' },
  uploadDesc: { fontSize: 13, color: '#334155', marginVertical: 8, lineHeight: 18 },
  uploadBtn: { backgroundColor: '#003D9B', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  recordCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  recordIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e6f0ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recordInfo: { flex: 1 },
  recordTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  badge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  badgeText: { color: '#003D9B', fontSize: 11, fontWeight: '700' },
  recordMeta: { fontSize: 12, color: '#64748b' },
  deleteBtn: { padding: 8 },
  securityNote: { marginTop: 24, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 12 },
  securityText: { fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 16 },
});
