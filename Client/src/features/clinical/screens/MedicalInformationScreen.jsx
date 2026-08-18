import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import clinicalApi from '../api';

export default function MedicalInformationScreen({ route, navigation }) {
  const { user, token } = useSelector(state => state.auth);
  const targetPatientId = route.params?.patientId || user?._id || user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medicalInfo, setMedicalInfo] = useState({
    medicalConditions: ['Hypertension', 'Post-ACL Knee Stiffness'],
    allergies: ['Penicillin'],
    currentMedications: [
      { name: 'Etoricoxib', dosage: '90mg, 1x Daily' },
      { name: 'Pantoprazole', dosage: '40mg, Before Breakfast' },
    ],
    pastSurgeries: [
      { procedure: 'ACL Reconstruction', year: 2019, notes: 'Left Knee, full recovery' }
    ],
    clinicalFlags: ['Fall Risk Assessment Normal'],
    bloodGroup: user?.bloodGroup || 'O+',
    height: user?.height || 172,
    weight: user?.weight || 68,
  });

  const [isAllergyModalVisible, setAllergyModalVisible] = useState(false);
  const [newAllergyText, setNewAllergyText] = useState('');

  const [isMedModalVisible, setMedModalVisible] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');

  const [isConditionModalVisible, setConditionModalVisible] = useState(false);
  const [newConditionText, setNewConditionText] = useState('');

  const [isSurgeryModalVisible, setSurgeryModalVisible] = useState(false);
  const [newSurgeryProcedure, setNewSurgeryProcedure] = useState('');
  const [newSurgeryYear, setNewSurgeryYear] = useState('');
  const [newSurgeryNotes, setNewSurgeryNotes] = useState('');

  useEffect(() => {
    const loadMedicalData = async () => {
      try {
        setLoading(true);
        if (targetPatientId) {
          const res = await clinicalApi.getPatientMedicalInfo(targetPatientId, token);
          if (res.success && res.data) {
            setMedicalInfo(prev => ({
              ...prev,
              ...res.data,
              bloodGroup: res.data.bloodGroup || user?.bloodGroup || prev.bloodGroup,
              height: res.data.height || user?.height || prev.height,
              weight: res.data.weight || user?.weight || prev.weight,
              medicalConditions: res.data.medicalConditions?.length ? res.data.medicalConditions : prev.medicalConditions,
              allergies: res.data.allergies?.length ? res.data.allergies : prev.allergies,
              currentMedications: res.data.currentMedications?.length ? res.data.currentMedications : prev.currentMedications,
              pastSurgeries: res.data.pastSurgeries?.length ? res.data.pastSurgeries : prev.pastSurgeries,
            }));
          }
        }
      } catch (err) {
        console.warn('[MedicalInfo] Failed to fetch medical info:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMedicalData();
  }, [targetPatientId, token, user]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'OneMedical Clinical Profile',
        message: `Clinical Medical Summary for ${user?.name || 'Patient'}:\nBlood Group: ${medicalInfo.bloodGroup}\nAllergies: ${medicalInfo.allergies.join(', ') || 'None'}\nConditions: ${medicalInfo.medicalConditions.join(', ') || 'None'}`,
      });
    } catch (err) {
      // Ignored
    }
  };

  const handleAddAllergy = async () => {
    if (!newAllergyText.trim()) return;
    const updated = [...(medicalInfo.allergies || []), newAllergyText.trim()];
    setMedicalInfo(prev => ({ ...prev, allergies: updated }));
    setAllergyModalVisible(false);
    setNewAllergyText('');

    try {
      await clinicalApi.updatePatientMedicalInfo(targetPatientId, { allergies: updated }, token);
    } catch (e) {
      console.warn('Failed to sync allergy:', e.message);
    }
  };

  const handleAddMedication = async () => {
    if (!newMedName.trim()) return;
    const updated = [
      ...(medicalInfo.currentMedications || []),
      { name: newMedName.trim(), dosage: newMedDosage.trim() || 'As prescribed' }
    ];
    setMedicalInfo(prev => ({ ...prev, currentMedications: updated }));
    setMedModalVisible(false);
    setNewMedName('');
    setNewMedDosage('');

    try {
      await clinicalApi.updatePatientMedicalInfo(targetPatientId, { currentMedications: updated }, token);
    } catch (e) {
      console.warn('Failed to sync medication:', e.message);
    }
  };

  const handleAddCondition = async () => {
    if (!newConditionText.trim()) return;
    const updated = [...(medicalInfo.medicalConditions || []), newConditionText.trim()];
    setMedicalInfo(prev => ({ ...prev, medicalConditions: updated }));
    setConditionModalVisible(false);
    setNewConditionText('');

    try {
      await clinicalApi.updatePatientMedicalInfo(targetPatientId, { medicalConditions: updated }, token);
    } catch (e) {
      console.warn('Failed to sync condition:', e.message);
    }
  };

  const handleAddSurgery = async () => {
    if (!newSurgeryProcedure.trim()) return;
    const updated = [
      ...(medicalInfo.pastSurgeries || []),
      {
        procedure: newSurgeryProcedure.trim(),
        year: parseInt(newSurgeryYear.trim()) || new Date().getFullYear(),
        notes: newSurgeryNotes.trim() || 'Full recovery',
      }
    ];
    setMedicalInfo(prev => ({ ...prev, pastSurgeries: updated }));
    setSurgeryModalVisible(false);
    setNewSurgeryProcedure('');
    setNewSurgeryYear('');
    setNewSurgeryNotes('');

    try {
      await clinicalApi.updatePatientMedicalInfo(targetPatientId, { pastSurgeries: updated }, token);
    } catch (e) {
      console.warn('Failed to sync surgery:', e.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#003D9B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinical Medical Profile</Text>
        <TouchableOpacity style={styles.headerShareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* DEMOGRAPHICS & VITALS CARD */}
        <Text style={styles.sectionTitle}>PHYSICAL & BIOMETRIC DETAILS</Text>
        <View style={styles.vitalsCard}>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>Blood Group</Text>
              <Text style={styles.vitalVal}>{medicalInfo.bloodGroup || user?.bloodGroup || 'O+'}</Text>
            </View>
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>Height</Text>
              <Text style={styles.vitalVal}>{medicalInfo.height || user?.height || 172} <Text style={styles.vitalUnit}>cm</Text></Text>
            </View>
            <View style={styles.vitalBox}>
              <Text style={styles.vitalLabel}>Weight</Text>
              <Text style={styles.vitalVal}>{medicalInfo.weight || user?.weight || 68} <Text style={styles.vitalUnit}>kg</Text></Text>
            </View>
          </View>
        </View>

        {/* ALLERGIES SECTION */}
        <Text style={styles.sectionTitle}>KNOWN ALLERGIES</Text>
        <View style={styles.card}>
          {(!medicalInfo.allergies || medicalInfo.allergies.length === 0) ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No known drug or environmental allergies recorded.</Text>
            </View>
          ) : (
            <View style={styles.allergiesGrid}>
              {medicalInfo.allergies.map((item, idx) => (
                <View key={idx} style={styles.allergyBadge}>
                  <Ionicons name="warning-outline" size={14} color="#dc2626" style={{ marginRight: 4 }} />
                  <Text style={styles.allergyBadgeText}>{typeof item === 'string' ? item : (item?.name || item?.allergy || '')}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.addInlineBtn} onPress={() => setAllergyModalVisible(true)}>
            <Text style={styles.addInlineText}>+ Add Allergy</Text>
          </TouchableOpacity>
        </View>

        {/* MEDICAL CONDITIONS */}
        <Text style={styles.sectionTitle}>CHRONIC & CLINICAL CONDITIONS</Text>
        <View style={styles.card}>
          {(!medicalInfo.medicalConditions || medicalInfo.medicalConditions.length === 0) ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No chronic medical conditions recorded.</Text>
            </View>
          ) : (
            <View style={styles.conditionsRow}>
              {(medicalInfo.medicalConditions || []).map((cond, idx) => (
                <View key={idx} style={styles.conditionPill}>
                  <Text style={styles.conditionPillText}>{typeof cond === 'string' ? cond : (cond?.name || cond?.condition || '')}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.addInlineBtn} onPress={() => setConditionModalVisible(true)}>
            <Text style={styles.addInlineText}>+ Add Condition</Text>
          </TouchableOpacity>
        </View>

        {/* CURRENT MEDICATIONS */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>PRESCRIBED MEDICATIONS</Text>
        {(medicalInfo.currentMedications || []).map((med, idx) => (
          <View key={idx} style={styles.medCard}>
            <View style={styles.medIconBox}>
              <Ionicons name="bandage-outline" size={18} color="#003D9B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{typeof med?.name === 'string' ? med.name : 'Medication'}</Text>
              <Text style={styles.medDosage}>{typeof med?.dosage === 'string' ? med.dosage : '1x Daily'}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addMedicationBtn} onPress={() => setMedModalVisible(true)}>
          <Text style={styles.addMedicationBtnText}>+ Add Medication</Text>
        </TouchableOpacity>

        {/* SURGERIES & INJURY HISTORY */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>SURGICAL & INJURY HISTORY</Text>
        <View style={styles.card}>
          {(!medicalInfo.pastSurgeries || medicalInfo.pastSurgeries.length === 0) ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No past surgical or major injury history recorded.</Text>
            </View>
          ) : (
            (medicalInfo.pastSurgeries || []).map((surg, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.dotLineCol}>
                  <View style={styles.timelineDot} />
                  {idx < (medicalInfo.pastSurgeries.length - 1) && <View style={styles.timelineLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 12 }}>
                  <Text style={styles.injuryTitle}>{typeof surg?.procedure === 'string' ? surg.procedure : 'Surgical Procedure'}</Text>
                  <Text style={styles.injurySub}>{surg?.year ? `${surg.year} • ` : ''}{typeof surg?.notes === 'string' ? surg.notes : 'Recorded history'}</Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.addInlineBtn} onPress={() => setSurgeryModalVisible(true)}>
            <Text style={styles.addInlineText}>+ Add Surgical History</Text>
          </TouchableOpacity>
        </View>

        {/* CLINICAL NOTES & SPECIALIST OBSERVATIONS */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>CLINICAL OBSERVATIONS & NOTES</Text>
        <View style={styles.card}>
          {(!medicalInfo.clinicalNotes || medicalInfo.clinicalNotes.length === 0) ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No clinical observations recorded by specialist yet.</Text>
            </View>
          ) : (
            (medicalInfo.clinicalNotes || []).map((note, idx) => (
              <View key={note?._id || idx} style={[styles.noteCard, idx > 0 && { marginTop: 10 }]}>
                <View style={styles.noteHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={15} color="#003D9B" style={{ marginRight: 6 }} />
                    <Text style={styles.noteAuthor}>{typeof note?.author === 'string' ? note.author : 'Clinical Specialist'}</Text>
                  </View>
                  <Text style={styles.noteDate}>
                    {new Date(note?.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.noteBody}>{typeof note?.text === 'string' ? note.text : (typeof note?.note === 'string' ? note.note : '')}</Text>
              </View>
            ))
          )}
        </View>

        {/* EMERGENCY CONTACT */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>PRIMARY EMERGENCY CONTACT</Text>
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyAvatarCircle}>
            <Text style={styles.emergencyInitials}>EC</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyName}>{user?.emergencyContactName || 'Primary Emergency Contact'}</Text>
            <Text style={styles.emergencyPhone}>{user?.emergencyContactPhone || user?.emergencyContact || '+91 98765 43210'}</Text>
          </View>
          <TouchableOpacity
            style={styles.callCircleBtn}
            onPress={() => Alert.alert('Emergency Call', `Calling ${user?.emergencyContactPhone || user?.emergencyContact || '+91 98765 43210'}...`)}
          >
            <Ionicons name="call" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL: ADD ALLERGY */}
      <Modal visible={isAllergyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Allergy</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Penicillin, Peanuts, Pollen"
              value={newAllergyText}
              onChangeText={setNewAllergyText}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAllergyModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddAllergy}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD CONDITION */}
      <Modal visible={isConditionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Medical Condition</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Hypertension, Lower Back Pain, Asthma"
              value={newConditionText}
              onChangeText={setNewConditionText}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConditionModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddCondition}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD MEDICATION */}
      <Modal visible={isMedModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Prescribed Medication</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Medication Name (e.g. Paracetamol)"
              value={newMedName}
              onChangeText={setNewMedName}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              placeholder="Dosage & Frequency (e.g. 500mg 2x Daily)"
              value={newMedDosage}
              onChangeText={setNewMedDosage}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setMedModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddMedication}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD SURGERY */}
      <Modal visible={isSurgeryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Surgical / Injury History</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Procedure (e.g. ACL Reconstruction, Knee Arthroscopy)"
              value={newSurgeryProcedure}
              onChangeText={setNewSurgeryProcedure}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              placeholder="Year (e.g. 2021)"
              keyboardType="number-pad"
              value={newSurgeryYear}
              onChangeText={setNewSurgeryYear}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              placeholder="Notes (e.g. Left Knee, full recovery)"
              value={newSurgeryNotes}
              onChangeText={setNewSurgeryNotes}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSurgeryModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddSurgery}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerShareBtn: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  vitalsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalBox: {
    alignItems: 'center',
    flex: 1,
  },
  vitalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  vitalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  vitalUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  allergiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  allergyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  addInlineBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addInlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  conditionPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conditionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  medIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  medDosage: {
    fontSize: 11,
    color: '#64748b',
  },
  addMedicationBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  addMedicationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  timelineItem: {
    flexDirection: 'row',
  },
  dotLineCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 14,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0284c7',
    marginTop: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  injuryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  injurySub: {
    fontSize: 11,
    color: '#64748b',
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emergencyAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  emergencyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emergencyPhone: {
    fontSize: 12,
    color: '#64748b',
  },
  callCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  noteCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noteAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  noteBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
});
