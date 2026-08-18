import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import clinicalApi from '../api';

const BODY_REGIONS = [
  { id: 'cervical_spine', name: 'Neck & Cervical', icon: 'body-outline', side: 'both' },
  { id: 'shoulder_left', name: 'Left Shoulder', icon: 'hand-left-outline', side: 'both' },
  { id: 'shoulder_right', name: 'Right Shoulder', icon: 'hand-right-outline', side: 'both' },
  { id: 'lumbar_spine', name: 'Lumbar Spine & Lower Back', icon: 'accessibility-outline', side: 'back' },
  { id: 'hip', name: 'Hip & Pelvis', icon: 'walk-outline', side: 'both' },
  { id: 'knee', name: 'Knee Joint', icon: 'body-outline', side: 'front' },
  { id: 'ankle', name: 'Ankle & Foot', icon: 'footsteps-outline', side: 'both' },
];

const PAIN_TYPES = [
  { id: 'aching', label: '⚡ Aching' },
  { id: 'sharp', label: '🗡️ Sharp' },
  { id: 'burning', label: '🔥 Burning' },
  { id: 'throbbing', label: '💓 Throbbing' },
  { id: 'stiffness', label: '🪵 Stiffness' },
  { id: 'dull', label: '🌊 Dull' },
];

export default function BodyPainMapScreen({ route, navigation }) {
  const { token, user } = useSelector(state => state.auth);
  const patientId = route?.params?.patientId || route?.params?.userId || (user?.role === 'patient' ? (user?.userId || user?.id || user?._id) : undefined);

  const [viewSide, setViewSide] = useState('back'); // 'front' | 'back'
  const [selectedRegion, setSelectedRegion] = useState(BODY_REGIONS[3]); // Lumbar Spine
  const [painLevel, setPainLevel] = useState(4);
  const [selectedPainTypes, setSelectedPainTypes] = useState(['aching']);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPainLogs = async () => {
      try {
        setLoading(true);
        const query = patientId ? { patientId } : {};
        const res = await clinicalApi.getPainAssessments(query, token);
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.assessments || []);
          setLogs(list);
        }
      } catch (err) {
        console.warn('[BodyPainMap] Failed to load pain assessments:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPainLogs();
  }, [token, patientId]);

  const togglePainType = (id) => {
    if (selectedPainTypes.includes(id)) {
      if (selectedPainTypes.length > 1) {
        setSelectedPainTypes(selectedPainTypes.filter((t) => t !== id));
      }
    } else {
      setSelectedPainTypes([...selectedPainTypes, id]);
    }
  };

  const getPainColor = (level) => {
    if (level <= 3) return '#10b981'; // Green
    if (level <= 6) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getPainLabel = (level) => {
    if (level <= 3) return 'Mild Discomfort';
    if (level <= 6) return 'Moderate Pain';
    return 'Severe Pain';
  };

  const handleSavePainLog = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const payload = {
        patientId: patientId || user?.userId || user?.id,
        userId: patientId || user?.userId || user?.id,
        bodyRegion: selectedRegion?.id || 'lumbar_spine',
        painScore: painLevel,
        painLevel: painLevel,
        painType: selectedPainTypes[0] || 'aching',
        sensation: selectedPainTypes[0] || 'aching',
        coordinates: {
          x: 50,
          y: selectedRegion?.id === 'cervical_spine' ? 20 : selectedRegion?.id === 'lumbar_spine' ? 50 : 75,
          side: viewSide,
        },
        triggers: ['movement', 'prolonged posture'],
        relievers: ['rest', 'prescribed exercises'],
        notes: `Clinical pain assessment for ${selectedRegion?.name || 'region'} with sensations: ${selectedPainTypes.join(', ')}.`,
        source: 'body_map',
      };

      const res = await clinicalApi.createPainAssessment(payload, token);

      if (res.success) {
        const newRecord = res.data;
        setLogs(prev => [newRecord, ...prev]);

        Alert.alert(
          'Pain Assessment Logged',
          `Recorded ${selectedRegion?.name || 'Lumbar'} pain score ${painLevel}/10 for clinical tracking.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to save pain assessment.');
      }
    } catch (err) {
      Alert.alert('Network Error', err.message || 'Could not reach clinical service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interactive Pain Map</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* FRONT / BACK SIDE TOGGLE */}
        <View style={styles.sideToggleBar}>
          <TouchableOpacity
            style={[styles.sideToggleBtn, viewSide === 'front' && styles.sideToggleBtnActive]}
            onPress={() => setViewSide('front')}
          >
            <Text style={[styles.sideToggleText, viewSide === 'front' && styles.sideToggleTextActive]}>
              Front View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sideToggleBtn, viewSide === 'back' && styles.sideToggleBtnActive]}
            onPress={() => setViewSide('back')}
          >
            <Text style={[styles.sideToggleText, viewSide === 'back' && styles.sideToggleTextActive]}>
              Back View
            </Text>
          </TouchableOpacity>
        </View>

        {/* HIGH PAIN WARNING BANNER */}
        {painLevel >= 7 && (
          <View style={styles.highPainBanner}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.highPainBannerText}>
              High pain level recorded ({painLevel}/10). Your clinical care team will be notified.
            </Text>
          </View>
        )}

        {/* BODY REGIONS SELECTOR */}
        <Text style={styles.sectionTitle}>1. Select Affected Anatomical Region</Text>
        <View style={styles.regionGrid}>
          {BODY_REGIONS.map((reg) => {
            const isSelected = selectedRegion?.id === reg.id;
            return (
              <TouchableOpacity
                key={reg.id}
                style={[styles.regionChip, isSelected && styles.regionChipActive]}
                onPress={() => setSelectedRegion(reg)}
              >
                <Ionicons
                  name={reg.icon}
                  size={16}
                  color={isSelected ? '#ffffff' : '#003D9B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.regionChipText, isSelected && styles.regionChipTextActive]}>
                  {reg.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PAIN INTENSITY SLIDER / SELECTOR */}
        <Text style={styles.sectionTitle}>2. Rate Current Pain Intensity (0–10 VAS)</Text>
        <View style={styles.painSliderCard}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: getPainColor(painLevel) }]}>
              {painLevel}
            </Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.scoreLabel, { color: getPainColor(painLevel) }]}>
                {getPainLabel(painLevel)}
              </Text>
              <Text style={styles.scoreSub}>Selected for {selectedRegion?.name || 'Region'}</Text>
            </View>
          </View>

          <View style={styles.chipsRow}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
              const isSelected = painLevel === score;
              return (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: getPainColor(score) },
                  ]}
                  onPress={() => setPainLevel(score)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PAIN SENSATION TYPE */}
        <Text style={styles.sectionTitle}>3. Describe Sensation Type</Text>
        <View style={styles.painTypesGrid}>
          {PAIN_TYPES.map((pt) => {
            const isSelected = selectedPainTypes.includes(pt.id);
            return (
              <TouchableOpacity
                key={pt.id}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => togglePainType(pt.id)}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                  {pt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          disabled={saving}
          onPress={handleSavePainLog}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Record Clinical Pain Entry</Text>
          )}
        </TouchableOpacity>

        {/* RECENT PAIN ASSESSMENTS LIST */}
        <Text style={styles.sectionTitle}>Recent Pain History</Text>
        {loading ? (
          <ActivityIndicator color="#003D9B" style={{ marginVertical: 12 }} />
        ) : logs.length === 0 ? (
          <Text style={styles.emptyText}>No pain assessments recorded yet.</Text>
        ) : (
          logs.slice(0, 5).map((item, idx) => (
            <View key={item._id || idx} style={styles.historyCard}>
              <View style={[styles.historyBadge, { backgroundColor: getPainColor(item.painScore || item.painLevel || 0) }]}>
                <Text style={styles.historyBadgeText}>{item.painScore !== undefined ? item.painScore : item.painLevel}/10</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.historyRegion}>
                  {(item.bodyRegion || 'General').toUpperCase().replace('_', ' ')}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.date || item.recordedAt || item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })} • {item.painType || item.sensation || 'Aching'}
                </Text>
              </View>
            </View>
          ))
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
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sideToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  sideToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  sideToggleBtnActive: {
    backgroundColor: '#ffffff',
  },
  sideToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  sideToggleTextActive: {
    color: '#003D9B',
  },
  highPainBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  highPainBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 6,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  regionChipActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  regionChipTextActive: {
    color: '#ffffff',
  },
  painSliderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  scoreSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    width: 28,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  painTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeChipActive: {
    backgroundColor: '#e6f0ff',
    borderColor: '#003D9B',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  typeChipTextActive: {
    color: '#003D9B',
  },
  saveBtn: {
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  historyBadge: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  historyRegion: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
