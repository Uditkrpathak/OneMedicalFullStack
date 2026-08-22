import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { updateProfile } from '../authSlice';
import userApi from '../userApi';

const formatDateToMMDDYYYY = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  } catch (e) {
    return String(dateVal);
  }
};

export default function EditPatientProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || user?.phone || '');
  const [dob, setDob] = useState(formatDateToMMDDYYYY(user?.dob) || '');
  const [gender, setGender] = useState(
    user?.gender
      ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase()
      : 'Other'
  );

  const [height, setHeight] = useState(user?.height ? String(user.height) : '170');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '65');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'B+ Positive');

  const [emergencyName, setEmergencyName] = useState(user?.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(
    user?.emergencyContact?.relationship || user?.emergencyContact?.relation || ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContact?.phone || '');

  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
  );

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch live patient profile from MongoDB on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      setLoadingProfile(true);
      try {
        const res = await userApi.getMyProfile(token);
        if (res.success && res.data) {
          const u = res.data.user || {};
          const p = res.data.profile || {};

          if (u.name) setName(u.name);
          if (u.email) setEmail(u.email);
          if (u.phoneNumber) setPhone(u.phoneNumber);
          if (u.avatarUrl) setAvatarUrl(u.avatarUrl);

          const profileDob = p.dob || u.dob;
          if (profileDob) setDob(formatDateToMMDDYYYY(profileDob));

          const profileGender = p.gender || u.gender;
          if (profileGender) {
            setGender(profileGender.charAt(0).toUpperCase() + profileGender.slice(1).toLowerCase());
          }

          if (p.height !== undefined || u.height !== undefined) setHeight(String(p.height || u.height));
          if (p.weight !== undefined || u.weight !== undefined) setWeight(String(p.weight || u.weight));
          if (p.bloodGroup || u.bloodGroup) setBloodGroup(p.bloodGroup || u.bloodGroup);

          const ec = p.emergencyContact || u.emergencyContact || {};
          if (ec.name) setEmergencyName(ec.name);
          if (ec.relationship || ec.relation) setEmergencyRelation(ec.relationship || ec.relation);
          if (ec.phone) setEmergencyPhone(ec.phone);

          // Synchronize Redux store
          dispatch(updateProfile({
            ...u,
            ...p,
            height: p.height ?? u.height,
            weight: p.weight ?? u.weight,
            bloodGroup: p.bloodGroup ?? u.bloodGroup,
            emergencyContact: ec,
          }));
        }
      } catch (err) {
        console.warn('[EditPatientProfile] Failed to fetch live profile:', err.message);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, [token]);

  const handleSave = async () => {
    if (!name || name.trim().length < 2) {
      Alert.alert('Validation Error', 'Please enter a valid Full Name (min 2 characters).');
      return;
    }

    const nameRegex = /^[a-zA-Z\s.-]+$/;
    if (!nameRegex.test(name.trim())) {
      Alert.alert('Validation Error', 'Full Name can only contain letters, spaces, dots, or hyphens.');
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid email address.');
        return;
      }
    }

    if (phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 phone format check
      const digitsOnly = phone.replace(/\D/g, '');
      if (!phoneRegex.test(phone) || digitsOnly.length < 10 || digitsOnly.length > 15) {
        Alert.alert('Validation Error', 'Please enter a valid 10-15 digit Mobile Number.');
        return;
      }
    }

    let formattedDob = null;
    if (dob) {
      const validateDOB = (dobString) => {
        const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
        if (!regex.test(dobString)) return false;

        const parts = dobString.split('/');
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) return false;

        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) return false;

        const dobDate = new Date(year, month - 1, day);
        if (dobDate > new Date()) return false;

        return true;
      };

      if (!validateDOB(dob)) {
        Alert.alert(
          'Validation Error',
          'Please enter a valid Date of Birth in MM/DD/YYYY format (e.g. 05/14/1996) and not in the future.'
        );
        return;
      }

      const parts = dob.split('/');
      formattedDob = new Date(Date.UTC(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10))).toISOString();
    }

    const heightNum = height ? Number(height) : undefined;
    if (heightNum !== undefined && (isNaN(heightNum) || heightNum < 50 || heightNum > 250)) {
      Alert.alert('Validation Error', 'Height must be a valid number between 50 and 250 cm.');
      return;
    }

    const weightNum = weight ? Number(weight) : undefined;
    if (weightNum !== undefined && (isNaN(weightNum) || weightNum < 10 || weightNum > 300)) {
      Alert.alert('Validation Error', 'Weight must be a valid number between 10 and 300 kg.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl.trim(),
        profileImageUrl: avatarUrl.trim(),
        dob: formattedDob,
        gender: gender.toLowerCase(),
        height: heightNum,
        weight: weightNum,
        bloodGroup: bloodGroup.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelation.trim(),
          relation: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
      };

      const res = await userApi.updatePatientProfile(token, payload);
      
      const updatedUser = res?.data?.user || {};
      const updatedProfile = res?.data?.profile || {};

      dispatch(
        updateProfile({
          name: updatedUser.name || name.trim(),
          email: updatedUser.email || email.trim(),
          avatarUrl: updatedUser.avatarUrl || avatarUrl.trim(),
          profileImageUrl: updatedUser.profileImageUrl || avatarUrl.trim(),
          phoneNumber: updatedUser.phoneNumber || phone || user?.phoneNumber,
          dob: formattedDob,
          gender: gender.toLowerCase(),
          height: heightNum,
          weight: weightNum,
          bloodGroup: bloodGroup.trim(),
          emergencyContact: payload.emergencyContact,
          isProfileCompleted: true,
          ...updatedProfile,
        })
      );

      setSaving(false);
      Alert.alert('Profile Saved', 'Your profile updates and photo have been successfully saved to MongoDB.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setSaving(false);
      Alert.alert('Save Error', err.message || 'Failed to save profile updates.');
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Select an option to update your photo:', [
      {
        text: 'Avatar 1 (Male)',
        onPress: () => setAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'),
      },
      {
        text: 'Avatar 2 (Female)',
        onPress: () => setAvatarUrl('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'),
      },
      {
        text: 'Avatar 3 (Athletic)',
        onPress: () => setAvatarUrl('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'),
      },
      {
        text: 'Custom Image URL',
        onPress: () => {
          Alert.prompt
            ? Alert.prompt('Custom Photo URL', 'Paste direct image URL:', (text) => {
                if (text && text.trim().startsWith('http')) setAvatarUrl(text.trim());
              })
            : setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.headerShareBtn}
          onPress={() => navigation.navigate('ProfileSettings')}
        >
          <Ionicons name="settings-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loadingProfile ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: '600' }}>
            Loading Profile...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* AVATAR CHANGE ROW */}
          <View style={styles.avatarChangeWrap}>
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickPhoto}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* PERSONAL INFORMATION SECTION */}
          <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. john@example.com"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.phoneLabelRow}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ChangeMobile')}>
                <Text style={styles.changeLinkText}>Change</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
              value={phone}
              editable={false}
              placeholder="+919XXXXXXXXX"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Date of Birth (MM/DD/YYYY)</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderPillsRow}>
              {['Female', 'Male', 'Other'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.genderPill, gender === item && styles.genderPillActive]}
                  onPress={() => setGender(item)}
                >
                  <Text style={[styles.genderPillText, gender === item && styles.genderPillTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BODY INFORMATION SECTION */}
          <Text style={styles.sectionTitle}>BODY INFORMATION</Text>
          <View style={styles.card}>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="170"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="65"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Blood Group</Text>
            <TextInput
              style={styles.input}
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="e.g. B+ Positive"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* EMERGENCY CONTACT SECTION */}
          <Text style={styles.sectionTitle}>EMERGENCY CONTACT</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Contact Name</Text>
            <TextInput
              style={styles.input}
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="Contact Full Name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Relationship</Text>
            <TextInput
              style={styles.input}
              value={emergencyRelation}
              onChangeText={setEmergencyRelation}
              placeholder="e.g. Spouse, Parent, Sibling"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
              placeholder="+919XXXXXXXXX"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* SAVE CTA */}
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile Changes</Text>
            )}
          </TouchableOpacity>

          {/* DELETE HEALTH PROFILE */}
          <TouchableOpacity
            style={styles.deleteLinkBtn}
            onPress={() => navigation.navigate('DeleteAccount')}
          >
            <Text style={styles.deleteLinkText}>Delete My Health Profile</Text>
          </TouchableOpacity>
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
  avatarChangeWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  changePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  phoneLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  changeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  genderPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  genderPill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  genderPillTextActive: {
    color: '#003D9B',
    fontWeight: '800',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  saveBtn: {
    backgroundColor: '#003D9B',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  deleteLinkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  deleteLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
});
