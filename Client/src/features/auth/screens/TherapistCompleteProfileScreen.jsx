import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { useUpdateTherapistProfileMutation } from '../authApiSlice';
import { updateProfileStatus, loginSuccess, logout } from '../authSlice';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TherapistCompleteProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [updateTherapistProfile, { isLoading }] = useUpdateTherapistProfileMutation();

  const handleExitAttempt = () => {
    Alert.alert(
      'Profile Setup Required',
      'Please complete your specialist credentials before accessing the therapist workspace. Would you like to log out?',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
    return true;
  };

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', handleExitAttempt);
    return () => backSub.remove();
  }, []);

  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [form, setForm] = useState({
    name: user?.name || 'Dr. Ananya Iyer',
    medicalId: 'OMP-1024',
    clinicName: 'One Medical - Downtown',
    department: 'Sports Physiotherapy',
    designation: 'Senior Physiotherapist',
    contactNumber: user?.phoneNumber || '+91 98765 43210',
    yearsOfExperience: '8+ Years',
    primarySpecialization: "Sports Rehabilitation",
    secondarySpecialization: 'Post-Op Care',
    languagesSpoken: 'English, Hindi, Spanish',
    bio: 'Specialized in post-operative sports injury rehab, spinal manual therapy, and movement optimization.',
    inClinic: true,
    online: true,
    homeVisit: false,
    defaultDurationMins: '45 Minutes',
    bufferTimeMins: '15 Minutes',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    appointmentReminders: true,
    progressUpdates: true,
    urgentNotifications: true,
  });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.medicalId) {
      Alert.alert('Required Fields', 'Please fill in your Name and Medical ID.');
      return;
    }

    try {
      const res = await updateTherapistProfile({
        name: form.name,
        medicalId: form.medicalId,
        clinicName: form.clinicName,
        department: form.department,
        designation: form.designation,
        workingDays: selectedDays,
        bio: form.bio,
      }).unwrap();

      if (res?.success && res?.data?.user) {
        dispatch(loginSuccess({ user: res.data.user, token }));
        Alert.alert('Profile Complete! 🎉', 'Your therapist profile has been saved.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'TherapistHome' }],
        });
        return;
      }
      throw new Error(res?.error?.message || 'Profile save failed');
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Unable to save profile details. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={handleExitAttempt}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
          </View>
          <Text style={styles.brandText}>ONE MEDICAL</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* HERO TITLE */}
        <View style={styles.heroTitleWrap}>
          <Text style={styles.heroTitle}>Complete Your Profile</Text>
          <Text style={styles.heroSub}>Help us personalize your clinical profile</Text>
        </View>

        {/* AVATAR PICKER */}
        <View style={styles.avatarPickerWrap}>
          <View style={styles.avatarCircle}>
            <Image
              source={require('../../../../assets/images/therapist_female_1.jpg')}
              style={styles.avatarPhoto}
            />
            <TouchableOpacity style={styles.cameraCircle}>
              <Ionicons name="camera" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.uploadPhotoText}>Upload Professional Photo</Text>
        </View>

        {/* SECTION: CLINICAL CREDENTIALS */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="medical-outline" size={16} color="#0038A8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Clinical Credentials</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(v) => handleChange('name', v)} placeholder="Dr. Ananya Iyer" />

          <Text style={styles.label}>MEDICAL ID</Text>
          <TextInput style={styles.input} value={form.medicalId} onChangeText={(v) => handleChange('medicalId', v)} placeholder="OMP-1024" />

          <Text style={styles.label}>CLINIC HUB</Text>
          <TextInput style={styles.input} value={form.clinicName} onChangeText={(v) => handleChange('clinicName', v)} placeholder="One Medical - Downtown" />

          <Text style={styles.label}>DEPARTMENT</Text>
          <TextInput style={styles.input} value={form.department} onChangeText={(v) => handleChange('department', v)} placeholder="Sports Physiotherapy" />

          <Text style={styles.label}>DESIGNATION</Text>
          <TextInput style={styles.input} value={form.designation} onChangeText={(v) => handleChange('designation', v)} placeholder="Senior Physiotherapist" />

          <Text style={styles.label}>CONTACT NUMBER</Text>
          <TextInput style={styles.input} value={form.contactNumber} onChangeText={(v) => handleChange('contactNumber', v)} placeholder="+91 98765 43210" />

          <Text style={styles.label}>YEARS OF EXPERIENCE</Text>
          <TextInput style={styles.input} value={form.yearsOfExperience} onChangeText={(v) => handleChange('yearsOfExperience', v)} placeholder="8+ Years" />

          <Text style={styles.label}>PRIMARY SPECIALIZATION</Text>
          <TextInput style={styles.input} value={form.primarySpecialization} onChangeText={(v) => handleChange('primarySpecialization', v)} placeholder="Sports Rehabilitation" />

          <Text style={styles.label}>SECONDARY SPECIALIZATION</Text>
          <TextInput style={styles.input} value={form.secondarySpecialization} onChangeText={(v) => handleChange('secondarySpecialization', v)} placeholder="Post-Op Care" />

          <Text style={styles.label}>LANGUAGES SPOKEN</Text>
          <TextInput style={styles.input} value={form.languagesSpoken} onChangeText={(v) => handleChange('languagesSpoken', v)} placeholder="English, Hindi, Spanish" />
        </View>

        {/* SECTION: ABOUT YOU */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={16} color="#0038A8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>About You</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>INTRODUCE YOURSELF TO YOUR PATIENTS</Text>
          <TextInput
            style={[styles.input, styles.textAreaInput]}
            multiline
            numberOfLines={4}
            value={form.bio}
            onChangeText={(v) => handleChange('bio', v)}
            placeholder="Introduce yourself to your patients..."
          />
          <Text style={styles.charCountText}>{form.bio.length} / 250</Text>
        </View>

        {/* SECTION: CONSULTATION PREFERENCES */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="git-branch-outline" size={16} color="#0038A8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Consultation Preferences</Text>
        </View>
        <View style={styles.formCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>In-Clinic Consultation</Text>
              <Text style={styles.toggleSub}>Available at One Medical hub</Text>
            </View>
            <Switch
              value={form.inClinic}
              onValueChange={(v) => handleChange('inClinic', v)}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={form.inClinic ? '#16a34a' : '#ffffff'}
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Online Consultation</Text>
              <Text style={styles.toggleSub}>Conduct HD tele-rehab sessions</Text>
            </View>
            <Switch
              value={form.online}
              onValueChange={(v) => handleChange('online', v)}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={form.online ? '#16a34a' : '#ffffff'}
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Home Visit</Text>
              <Text style={styles.toggleSub}>At-home therapy sessions</Text>
            </View>
            <Switch
              value={form.homeVisit}
              onValueChange={(v) => handleChange('homeVisit', v)}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={form.homeVisit ? '#16a34a' : '#ffffff'}
            />
          </View>
        </View>

        {/* SECTION: CONSULTATION SETTINGS */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="options-outline" size={16} color="#0038A8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Consultation Settings</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>DEFAULT CONSULTATION DURATION</Text>
          <View style={styles.selectInputBox}>
            <Text style={styles.selectInputText}>{form.defaultDurationMins}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </View>

          <Text style={styles.label}>BUFFER TIME BETWEEN SESSIONS</Text>
          <View style={styles.selectInputBox}>
            <Text style={styles.selectInputText}>{form.bufferTimeMins}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </View>
        </View>

        {/* SECTION: WORKING PREFERENCES */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="calendar-outline" size={16} color="#0038A8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Working Preferences</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>WORKING DAYS</Text>
          <View style={styles.daysGrid}>
            {DAYS.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, isSelected && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timeRangeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>START TIME</Text>
              <View style={styles.selectInputBox}>
                <Text style={styles.selectInputText}>{form.startTime}</Text>
              </View>
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>END TIME</Text>
              <View style={styles.selectInputBox}>
                <Text style={styles.selectInputText}>{form.endTime}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoNoteBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0038A8" style={{ marginRight: 8 }} />
            <Text style={styles.infoNoteText}>
              When you set your availability, your slots automatically sync with patient booking calendar.
            </Text>
          </View>
        </View>

        {/* SECTION: NOTIFICATIONS */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="notifications-outline" size={16} color="#0038A8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Notifications</Text>
        </View>
        <View style={styles.formCard}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Appointment Reminders</Text>
            <Switch
              value={form.appointmentReminders}
              onValueChange={(v) => handleChange('appointmentReminders', v)}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={form.appointmentReminders ? '#16a34a' : '#ffffff'}
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Patient Progress Updates</Text>
            <Switch
              value={form.progressUpdates}
              onValueChange={(v) => handleChange('progressUpdates', v)}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={form.progressUpdates ? '#16a34a' : '#ffffff'}
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Urgent Patient Notifications</Text>
            <Switch
              value={form.urgentNotifications}
              onValueChange={(v) => handleChange('urgentNotifications', v)}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={form.urgentNotifications ? '#16a34a' : '#ffffff'}
            />
          </View>
        </View>

        {/* ADMIN MANAGED FOOTER NOTE */}
        <Text style={styles.adminFooterNote}>
          🔒 Some information is managed by your clinic administrator. If you notice any error, please contact your admin.
        </Text>
      </ScrollView>

      {/* STICKY CONTINUE CTA */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.88}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueBtnText}>Continue ➔</Text>
          )}
        </TouchableOpacity>
      </View>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#0038A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  heroTitleWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  avatarPickerWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    position: 'relative',
    marginBottom: 8,
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    backgroundColor: '#e2e8f0',
  },
  cameraCircle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0038A8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  uploadPhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0038A8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  formCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  charCountText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  selectInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  selectInputText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  dayChipActive: {
    backgroundColor: '#0038A8',
    borderColor: '#0038A8',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  dayChipTextActive: {
    color: '#ffffff',
  },
  timeRangeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  infoNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#0038A8',
    lineHeight: 16,
  },
  adminFooterNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  bottomCtaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  continueBtn: {
    backgroundColor: '#0038A8',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
