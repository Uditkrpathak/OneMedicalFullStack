import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { colors } from '../../../theme/colors';

const { height } = Dimensions.get('window');

export default function SetupCompleteScreen({ navigation }) {
  const { user } = useSelector((state) => state.auth);

  const handleEnterApp = () => {
    const isTherapist = user?.role === 'therapist';
    navigation.reset({
      index: 0,
      routes: [{ name: isTherapist ? 'TherapistHome' : 'PatientHome' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Hero Image */}
      <View style={styles.headerImageContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80' }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Checkmark Badge */}
        <View style={styles.checkmarkBadge}>
          <Ionicons name="checkmark" size={24} color="#ffffff" />
        </View>

        <View style={styles.imageOverlayGradient} />
      </View>

      {/* Content */}
      <View style={styles.contentCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={styles.mainTitle}>You're All Set!</Text>
          <Ionicons name="sparkles" size={24} color="#0284c7" />
        </View>
        <Text style={styles.subTitle}>
          Your profile is ready. Book appointments, follow recovery programs and track your progress with ONE MEDICAL.
        </Text>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleEnterApp}
        >
          <Text style={styles.primaryButtonText}>Explore ONE MEDICAL</Text>
        </TouchableOpacity>

        {/* Secondary Link */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleEnterApp}
        >
          <Text style={styles.secondaryText}>Maybe Later</Text>
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
  headerImageContainer: {
    height: height * 0.5,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary || '#0047AB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: colors.primary || '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  imageOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
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
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'space-between',
    paddingBottom: 30,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: colors.primary || '#0047AB',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary || '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
