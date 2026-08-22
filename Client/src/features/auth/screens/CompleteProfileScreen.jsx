import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  BackHandler,
  Modal,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { useUpdatePatientProfileMutation } from '../authApiSlice';
import { updateProfile, updateProfileStatus, loginSuccess, logout } from '../authSlice';
import { colors } from '../../../theme/colors';

const AVATAR_PRESETS = [
  { id: '1', label: 'Male 1', uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' },
  { id: '2', label: 'Female 1', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
  { id: '3', label: 'Male 2', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' },
  { id: '4', label: 'Female 2', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' },
  { id: '5', label: 'Male 3', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' },
  { id: '6', label: 'Female 3', uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400' },
];

const CONCERNS = [
  { id: 'back_pain', icon: 'accessibility-outline', label: 'Back Pain', desc: 'Lumbar & spine relief' },
  { id: 'sports_injury', icon: 'fitness-outline', label: 'Sports Injury', desc: 'Get back to the field' },
  { id: 'knee_pain', icon: 'walk-outline', label: 'Knee Pain', desc: 'Joint mobility training' },
  { id: 'foot_pain', icon: 'footsteps-outline', label: 'Foot Pain', desc: 'Plantar & ankle care' },
  { id: 'mobility', icon: 'body-outline', label: 'Mobility', desc: 'Range of motion improvement' },
  { id: 'other', icon: 'help-circle-outline', label: 'Other', desc: 'Customized approach' },
];

export default function CompleteProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  const [updatePatientProfile, { isLoading }] = useUpdatePatientProfileMutation();
  const [profilePhoto, setProfilePhoto] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const handleExitAttempt = () => {
    Alert.alert(
      'Profile Setup Required',
      'Please complete your medical profile to access OneMedical care features. Would you like to log out?',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
    return true; // Prevent default Android back navigation
  };

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', handleExitAttempt);
    return () => backSub.remove();
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: user?.name || '',
      dob: '05/14/1996',
      gender: 'female',
      height: 175,
      weight: 68,
      primaryConcern: 'back_pain',
    },
  });

  const selectedGender = watch('gender');
  const heightVal = watch('height');
  const weightVal = watch('weight');
  const selectedConcern = watch('primaryConcern');

  const handlePickPhoto = () => {
    setShowPhotoModal(true);
  };

  const handleLaunchCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfilePhoto(result.assets[0].uri);
        setShowPhotoModal(false);
      }
    } catch (e) {
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Photo library access is required to choose a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfilePhoto(result.assets[0].uri);
        setShowPhotoModal(false);
      }
    } catch (e) {
      Alert.alert('Gallery Error', 'Could not open photo gallery on this device.');
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrl && customUrl.trim().startsWith('http')) {
      setProfilePhoto(customUrl.trim());
      setShowPhotoModal(false);
      setShowUrlInput(false);
      setCustomUrl('');
    } else {
      Alert.alert('Invalid URL', 'Please enter a valid image URL starting with http:// or https://');
    }
  };

  const onSubmit = async (data) => {
    if (!data.fullName || data.fullName.trim().length < 2) {
      Alert.alert('Validation Error', 'Please enter a valid Full Name (min 2 characters).');
      return;
    }

    const nameRegex = /^[a-zA-Z\s.-]+$/;
    if (!nameRegex.test(data.fullName.trim())) {
      Alert.alert('Validation Error', 'Full Name can only contain letters, spaces, dots, or hyphens.');
      return;
    }

    if (data.dob) {
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

      if (!validateDOB(data.dob)) {
        Alert.alert('Validation Error', 'Please enter a valid Date of Birth in mm/dd/yyyy format (year must be 4 digits, e.g. 1996, and not in the future).');
        return;
      }
    }

    const heightNum = parseInt(data.height, 10);
    if (isNaN(heightNum) || heightNum < 50 || heightNum > 250) {
      Alert.alert('Validation Error', 'Height must be a valid number between 50 and 250 cm.');
      return;
    }

    const weightNum = parseInt(data.weight, 10);
    if (isNaN(weightNum) || weightNum < 10 || weightNum > 300) {
      Alert.alert('Validation Error', 'Weight must be a valid number between 10 and 300 kg.');
      return;
    }

    const profilePayload = {
      name: data.fullName.trim(),
      dob: data.dob || null,
      gender: (data.gender || 'male').toLowerCase(),
      height: heightNum,
      weight: weightNum,
      primaryConcern: data.primaryConcern,
      avatarUrl: profilePhoto,
    };

    try {
      const res = await updatePatientProfile(profilePayload).unwrap();
      if (res?.success && res?.data?.user) {
        // Keep profile completion pending in Redux until permissions and all-set screens finish
        dispatch(loginSuccess({ user: { ...res.data.user, isProfileCompleted: false }, token }));
        navigation.navigate('EnablePermissions');
        return;
      }
      throw new Error(res?.error?.message || 'Profile update failed');
    } catch (err) {
      console.error('[CompleteProfile Error]:', err);
      const msg = err.data?.error?.message || err.data?.message || err.error || err.message || 'Unable to save profile details. Please try again.';
      Alert.alert('Save Failed', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleExitAttempt}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.brandBadgeRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="add-sharp" size={14} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>ONE MEDICAL</Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.mainTitle}>Complete Your Profile</Text>
        <Text style={styles.subTitle}>Help us personalize your recovery journey.</Text>

        {/* Profile Avatar with Photo Upload */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarCircle} onPress={handlePickPhoto} activeOpacity={0.85}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImagePhoto} />
            ) : (
              <Ionicons name="person" size={40} color="#94a3b8" />
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Let's get to know you</Text>
            <Text style={styles.introSubtitle}>
              We'll personalize your recovery journey in less than a minute.
            </Text>
          </View>
        </View>

        {/* PERSONAL DETAILS SECTION */}
        <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <Controller
            control={control}
            name="fullName"
            rules={{ required: 'Full name is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.textInput, errors.fullName && styles.inputError]}
                placeholder="John Doe"
                placeholderTextColor="#94a3b8"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {!!errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}
        </View>

        <View style={styles.rowTwoCol}>
          {/* DOB */}
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Date of Birth</Text>
            <Controller
              control={control}
              name="dob"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.textInput}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </View>

          {/* Gender */}
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, selectedGender === 'male' && styles.genderBtnActive]}
                onPress={() => setValue('gender', 'male')}
              >
                <Text style={[styles.genderText, selectedGender === 'male' && styles.genderTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, selectedGender === 'female' && styles.genderBtnActive]}
                onPress={() => setValue('gender', 'female')}
              >
                <Text style={[styles.genderText, selectedGender === 'female' && styles.genderTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* BODY MEASUREMENTS SECTION */}
        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>BODY MEASUREMENTS</Text>

        <View style={styles.rowTwoCol}>
          {/* Height */}
          <View style={[styles.measurementBox, { marginRight: 10 }]}>
            <Text style={styles.measurementLabel}>Height (cm)</Text>
            <View style={styles.measurementValueRow}>
              <TouchableOpacity onPress={() => setValue('height', Math.max(120, Number(heightVal || 175) - 1))}>
                <Ionicons name="remove-circle-outline" size={22} color="#64748b" />
              </TouchableOpacity>
              <Controller
                control={control}
                name="height"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.measurementInput}
                    keyboardType="number-pad"
                    value={String(value)}
                    onChangeText={(txt) => onChange(Number(txt) || 175)}
                  />
                )}
              />
              <TouchableOpacity onPress={() => setValue('height', Number(heightVal || 175) + 1)}>
                <Ionicons name="add-circle-outline" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weight */}
          <View style={styles.measurementBox}>
            <Text style={styles.measurementLabel}>Weight (kg)</Text>
            <View style={styles.measurementValueRow}>
              <TouchableOpacity onPress={() => setValue('weight', Math.max(30, Number(weightVal || 68) - 1))}>
                <Ionicons name="remove-circle-outline" size={22} color="#64748b" />
              </TouchableOpacity>
              <Controller
                control={control}
                name="weight"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.measurementInput}
                    keyboardType="number-pad"
                    value={String(value)}
                    onChangeText={(txt) => onChange(Number(txt) || 68)}
                  />
                )}
              />
              <TouchableOpacity onPress={() => setValue('weight', Number(weightVal || 68) + 1)}>
                <Ionicons name="add-circle-outline" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* PRIMARY CONCERN SECTION */}
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>PRIMARY CONCERN</Text>

        <View style={styles.concernGrid}>
          {CONCERNS.map((item) => {
            const isSelected = selectedConcern === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.concernCard, isSelected && styles.concernCardSelected]}
                activeOpacity={0.8}
                onPress={() => setValue('primaryConcern', item.id)}
              >
                <View style={[styles.concernIconBox, isSelected && styles.concernIconBoxSelected]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isSelected ? '#ffffff' : colors.primary || '#0047AB'}
                  />
                </View>
                <Text style={[styles.concernTitle, isSelected && styles.concernTitleSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.concernDesc} numberOfLines={2}>
                  {item.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Primary CTA */}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          activeOpacity={0.85}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* PHOTO SELECTION MODAL */}
      <Modal visible={showPhotoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Profile Photo</Text>
              <TouchableOpacity onPress={() => { setShowPhotoModal(false); setShowUrlInput(false); }}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* ACTION BUTTONS: CAMERA & GALLERY & LINK */}
            <View style={styles.photoActionRow}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={handleLaunchCamera} activeOpacity={0.8}>
                <View style={[styles.photoActionIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="camera" size={22} color="#003D9B" />
                </View>
                <Text style={styles.photoActionText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoActionBtn} onPress={handleLaunchGallery} activeOpacity={0.8}>
                <View style={[styles.photoActionIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="images" size={22} color="#16a34a" />
                </View>
                <Text style={styles.photoActionText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoActionBtn} onPress={() => setShowUrlInput(!showUrlInput)} activeOpacity={0.8}>
                <View style={[styles.photoActionIcon, { backgroundColor: '#fdf4ff' }]}>
                  <Ionicons name="link" size={22} color="#a855f7" />
                </View>
                <Text style={styles.photoActionText}>Image Link</Text>
              </TouchableOpacity>
            </View>

            {/* CUSTOM URL INPUT */}
            {showUrlInput && (
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={styles.urlTextInput}
                  placeholder="Paste direct image URL (https://...)"
                  placeholderTextColor="#94a3b8"
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.urlApplyBtn} onPress={handleApplyCustomUrl}>
                  <Text style={styles.urlApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* AVATAR PRESETS */}
            <Text style={styles.presetSectionTitle}>Or select a medical avatar</Text>
            <View style={styles.presetGrid}>
              {AVATAR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetAvatarBox, profilePhoto === preset.uri && styles.presetAvatarBoxActive]}
                  onPress={() => {
                    setProfilePhoto(preset.uri);
                    setShowPhotoModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: preset.uri }} style={styles.presetAvatarImg} />
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: colors.primary || '#0047AB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary || '#0047AB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarImagePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  introCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#94a3b8',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '600',
  },
  rowTwoCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 3,
  },
  genderBtn: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: colors.primary || '#0047AB',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  genderTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  measurementBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  measurementValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  measurementInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    width: 50,
  },
  concernGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  concernCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  concernCardSelected: {
    borderColor: colors.primary || '#0047AB',
    backgroundColor: '#eff6ff',
  },
  concernIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  concernIconBoxSelected: {
    backgroundColor: colors.primary || '#0047AB',
  },
  concernTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  concernTitleSelected: {
    color: colors.primary || '#0047AB',
  },
  concernDesc: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary || '#0047AB',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary || '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Photo Selection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  photoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urlTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  urlApplyBtn: {
    backgroundColor: '#003D9B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  urlApplyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  presetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presetAvatarBox: {
    width: (width - 48 - 24) / 3,
    height: (width - 48 - 24) / 3,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  presetAvatarBoxActive: {
    borderColor: '#003D9B',
    borderWidth: 3,
  },
  presetAvatarImg: {
    width: '100%',
    height: '100%',
  },
});
