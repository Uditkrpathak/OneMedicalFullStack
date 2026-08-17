import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/colors';

const { height } = Dimensions.get('window');

export default function EnablePermissionsScreen({ navigation }) {
  const [permissions, setPermissions] = useState({
    reminders: true,
    location: false,
    photos: true,
  });

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Hero Image Banner */}
      <View style={styles.headerImageContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1563207153-f403bf289096?auto=format&fit=crop&w=800&q=80' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.imageOverlayGradient} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.contentCard}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Row */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="add-sharp" size={14} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>ONE MEDICAL</Text>
        </View>

        <Text style={styles.mainTitle}>Enable Your Experience</Text>
        <Text style={styles.subTitle}>
          Choose the features you'd like to use. You can change these anytime in Settings.
        </Text>

        {/* Permission Cards */}
        {/* Card 1: Appointment Reminders */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBox}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary || '#0047AB'} />
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Appointment Reminders</Text>
            <Text style={styles.permissionDesc}>Never miss upcoming appointments.</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.enableBtn,
              permissions.reminders && styles.enableBtnActive,
            ]}
            onPress={() => togglePermission('reminders')}
          >
            <Text
              style={[
                styles.enableBtnText,
                permissions.reminders && styles.enableBtnTextActive,
              ]}
            >
              {permissions.reminders ? 'Enabled ✓' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card 2: Nearby Clinics */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBox}>
            <Ionicons name="location-outline" size={20} color={colors.primary || '#0047AB'} />
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Nearby Clinics</Text>
            <Text style={styles.permissionDesc}>Find physiotherapy and clinics near your location.</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.enableBtn,
              permissions.location && styles.enableBtnActive,
            ]}
            onPress={() => togglePermission('location')}
          >
            <Text
              style={[
                styles.enableBtnText,
                permissions.location && styles.enableBtnTextActive,
              ]}
            >
              {permissions.location ? 'Enabled ✓' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card 3: Recovery Progress */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBox}>
            <Ionicons name="camera-outline" size={20} color={colors.primary || '#0047AB'} />
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Recovery Progress</Text>
            <Text style={styles.permissionDesc}>Upload photos to track your rehabilitation journey.</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.enableBtn,
              permissions.photos && styles.enableBtnActive,
            ]}
            onPress={() => togglePermission('photos')}
          >
            <Text
              style={[
                styles.enableBtnText,
                permissions.photos && styles.enableBtnTextActive,
              ]}
            >
              {permissions.photos ? 'Enabled ✓' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue Primary Action Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SetupComplete')}
        >
          <Text style={styles.primaryButtonText}>Continue ➔</Text>
        </TouchableOpacity>

        {/* Skip For Now Link */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('SetupComplete')}
        >
          <Text style={styles.skipText}>Skip for Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerImageContainer: {
    height: height * 0.36,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  imageOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollInner: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    marginBottom: 20,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  permissionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permissionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  enableBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  enableBtnActive: {
    backgroundColor: colors.primary || '#0047AB',
    borderColor: colors.primary || '#0047AB',
  },
  enableBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  enableBtnTextActive: {
    color: '#ffffff',
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
    marginTop: 16,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
